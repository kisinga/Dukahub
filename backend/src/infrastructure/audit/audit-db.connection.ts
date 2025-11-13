import { Injectable, OnModuleInit, Logger, OnModuleDestroy } from '@nestjs/common';
import { DataSource, DataSourceOptions } from 'typeorm';
import { auditDbConfig } from './audit-db.config';
import { AuditLog } from './audit-log.entity';

/**
 * Separate database connection for audit logs
 * 
 * Uses TimescaleDB for time-series optimized storage with automatic
 * retention policies for data older than 2 years.
 */
@Injectable()
export class AuditDbConnection implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(AuditDbConnection.name);
    private dataSource: DataSource | null = null;

    async onModuleInit(): Promise<void> {
        try {
            this.dataSource = new DataSource(auditDbConfig as DataSourceOptions);
            await this.dataSource.initialize();
            this.logger.log('Audit database connection established');

            // Initialize TimescaleDB hypertable and retention policy
            await this.initializeTimescaleDB();
        } catch (error) {
            this.logger.error(
                `Failed to initialize audit database: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined
            );
            // Don't throw - allow app to continue without audit logging
        }
    }

    async onModuleDestroy(): Promise<void> {
        if (this.dataSource?.isInitialized) {
            await this.dataSource.destroy();
            this.logger.log('Audit database connection closed');
        }
    }

    /**
     * Get the audit database connection
     */
    getConnection(): DataSource {
        if (!this.dataSource || !this.dataSource.isInitialized) {
            throw new Error('Audit database connection not initialized');
        }
        return this.dataSource;
    }

    /**
     * Check if connection is available
     */
    isAvailable(): boolean {
        return this.dataSource?.isInitialized || false;
    }

    /**
     * Initialize TimescaleDB hypertable and retention policy
     */
    private async initializeTimescaleDB(): Promise<void> {
        if (!this.dataSource) {
            return;
        }

        try {
            const queryRunner = this.dataSource.createQueryRunner();

            // Check if table already exists
            const tableExists = await queryRunner.query(`
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'audit_log'
                )
            `);

            if (!tableExists[0]?.exists) {
                // Create audit_log table with composite primary key for TimescaleDB
                await queryRunner.query(`
                    CREATE TABLE audit_log (
                        id uuid NOT NULL DEFAULT gen_random_uuid(),
                        timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        "channelId" uuid NOT NULL,
                        "eventType" character varying NOT NULL,
                        "entityType" character varying,
                        "entityId" character varying,
                        "userId" uuid,
                        data jsonb NOT NULL DEFAULT '{}',
                        source character varying NOT NULL,
                        CONSTRAINT "PK_audit_log" PRIMARY KEY (id, timestamp)
                    )
                `);
            }

            // Create indexes
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_audit_log_channel_timestamp" 
                ON audit_log ("channelId", timestamp DESC)
            `);

            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_audit_log_channel_entity" 
                ON audit_log ("channelId", "entityType", "entityId")
            `);

            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_audit_log_channel_user" 
                ON audit_log ("channelId", "userId")
            `);

            // Enable TimescaleDB extension if not already enabled
            await queryRunner.query(`
                CREATE EXTENSION IF NOT EXISTS timescaledb
            `);

            // Convert to hypertable (partitioned by timestamp)
            // Only if it's not already a hypertable
            const isHypertableResult = await queryRunner.query(`
                SELECT COUNT(*) as count
                FROM timescaledb_information.hypertables 
                WHERE hypertable_name = 'audit_log'
            `);

            const isHypertable = parseInt(isHypertableResult[0]?.count || '0', 10) > 0;

            if (!isHypertable) {
                await queryRunner.query(`
                    SELECT create_hypertable('audit_log', 'timestamp', 
                        chunk_time_interval => INTERVAL '7 days',
                        if_not_exists => TRUE)
                `);
                this.logger.log('Converted audit_log table to TimescaleDB hypertable');
            }

            // Check if retention policy already exists
            const retentionPolicyResult = await queryRunner.query(`
                SELECT COUNT(*) as count
                FROM timescaledb_information.jobs j
                WHERE j.proc_name = 'policy_retention'
                AND j.hypertable_name = 'audit_log'
            `);

            const hasRetentionPolicy = parseInt(retentionPolicyResult[0]?.count || '0', 10) > 0;

            // Create retention policy: drop data older than 2 years (730 days)
            // This runs automatically via TimescaleDB's job scheduler
            if (!hasRetentionPolicy) {
                await queryRunner.query(`
                    SELECT add_retention_policy('audit_log', INTERVAL '730 days', if_not_exists => TRUE)
                `);
                this.logger.log('TimescaleDB retention policy set: 730 days (2 years)');
            } else {
                this.logger.log('TimescaleDB retention policy already exists');
            }

            await queryRunner.release();
        } catch (error) {
            // If TimescaleDB extension is not available, log warning but continue
            // This allows the system to work with regular PostgreSQL if needed
            this.logger.warn(
                `TimescaleDB initialization failed (may not be available): ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
}

