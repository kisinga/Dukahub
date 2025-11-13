import { Injectable, Logger } from '@nestjs/common';
import {
    RequestContext,
} from '@vendure/core';
import { AuditLog } from './audit-log.entity';
import { AuditLogOptions, AuditTrailFilters } from './audit.types';
import { UserContextResolver } from './user-context.resolver';
import { AuditDbConnection } from './audit-db.connection';

/**
 * Audit Service
 * 
 * Simple, intuitive API for logging audit events.
 * Automatically extracts channelId and userId from RequestContext.
 */
@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(
        private readonly auditDbConnection: AuditDbConnection,
        private readonly userContextResolver: UserContextResolver
    ) {}

    /**
     * Log a user action (primary method)
     * Automatically extracts channelId and userId from RequestContext
     */
    async log(
        ctx: RequestContext,
        eventType: string,
        options: AuditLogOptions = {}
    ): Promise<void> {
        try {
            const channelId = ctx.channelId?.toString();
            if (!channelId) {
                this.logger.warn(
                    `Cannot log audit event ${eventType}: channelId not available in RequestContext`
                );
                return;
            }

            const userId = options.userId || this.userContextResolver.getUserId(ctx);

            if (!this.auditDbConnection.isAvailable()) {
                this.logger.warn('Audit database not available, skipping log');
                return;
            }

            // Check if user is superadmin (for audit tracking)
            const isSuperAdmin = userId ? await this.userContextResolver.isSuperAdmin(ctx) : false;

            const auditLog = new AuditLog();
            auditLog.channelId = channelId; // Already validated above
            auditLog.eventType = eventType;
            auditLog.entityType = options.entityType ?? null;
            auditLog.entityId = options.entityId ?? null;
            auditLog.userId = userId ?? null;
            auditLog.data = {
                ...(options.data || {}),
                isSuperAdmin, // Explicitly mark superadmin actions
            };
            auditLog.source = 'user_action';
            auditLog.timestamp = new Date();

            await this.auditDbConnection.getConnection()
                .getRepository(AuditLog)
                .save(auditLog);
        } catch (error) {
            // Non-blocking: don't fail the operation if audit logging fails
            this.logger.error(
                `Failed to log audit event ${eventType}: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined
            );
        }
    }

    /**
     * Log a system event (inherits user context from entity)
     */
    async logSystemEvent(
        ctx: RequestContext,
        eventType: string,
        entityType: string,
        entityId: string,
        data?: Record<string, any>
    ): Promise<void> {
        try {
            const channelId = ctx.channelId?.toString();
            if (!channelId) {
                // System events may not have channelId - skip logging if required
                this.logger.debug(
                    `Cannot log system event ${eventType}: channelId not available in RequestContext`
                );
                return;
            }

            // Try to get user context from entity
            const userId = await this.userContextResolver.getUserIdFromEntity(
                ctx,
                entityType,
                entityId
            ) || this.userContextResolver.getUserId(ctx);

            if (!this.auditDbConnection.isAvailable()) {
                this.logger.warn('Audit database not available, skipping system event log');
                return;
            }

            const auditLog = new AuditLog();
            auditLog.channelId = channelId; // Already validated above
            auditLog.eventType = eventType;
            auditLog.entityType = entityType;
            auditLog.entityId = entityId;
            auditLog.userId = userId ?? null;
            auditLog.data = data || {};
            auditLog.source = 'system_event';
            auditLog.timestamp = new Date();

            await this.auditDbConnection.getConnection()
                .getRepository(AuditLog)
                .save(auditLog);
        } catch (error) {
            // Non-blocking: don't fail the operation if audit logging fails
            this.logger.error(
                `Failed to log system event ${eventType}: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined
            );
        }
    }

    /**
     * Query audit log
     * Automatically filters by channel from RequestContext
     */
    async getAuditTrail(
        ctx: RequestContext,
        filters: AuditTrailFilters & { limit?: number; skip?: number } = {}
    ): Promise<AuditLog[]> {
        try {
            const channelId = ctx.channelId?.toString();
            if (!channelId) {
                this.logger.warn('Cannot query audit trail: channelId not available in RequestContext');
                return [];
            }

            if (!this.auditDbConnection.isAvailable()) {
                this.logger.warn('Audit database not available, returning empty audit trail');
                return [];
            }

            const queryBuilder = this.auditDbConnection.getConnection()
                .getRepository(AuditLog)
                .createQueryBuilder('audit')
                .where('audit.channelId = :channelId', { channelId })
                .orderBy('audit.timestamp', 'DESC');

            if (filters.entityType) {
                queryBuilder.andWhere('audit.entityType = :entityType', { entityType: filters.entityType });
            }

            if (filters.entityId) {
                queryBuilder.andWhere('audit.entityId = :entityId', { entityId: filters.entityId });
            }

            if (filters.userId) {
                queryBuilder.andWhere('audit.userId = :userId', { userId: filters.userId });
            }

            if (filters.eventType) {
                queryBuilder.andWhere('audit.eventType = :eventType', { eventType: filters.eventType });
            }

            if (filters.startDate) {
                queryBuilder.andWhere('audit.timestamp >= :startDate', { startDate: filters.startDate });
            }

            if (filters.endDate) {
                queryBuilder.andWhere('audit.timestamp <= :endDate', { endDate: filters.endDate });
            }

            // Apply pagination at database level for better performance
            if (filters.skip) {
                queryBuilder.skip(filters.skip);
            }

            if (filters.limit) {
                queryBuilder.take(filters.limit);
            }

            return await queryBuilder.getMany();
        } catch (error) {
            this.logger.error(
                `Failed to query audit trail: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined
            );
            return [];
        }
    }
}

