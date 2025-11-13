import path from 'path';
import { DataSourceOptions } from 'typeorm';
import { env } from '../config/environment.config';

/**
 * Separate database connection configuration for audit logs (TimescaleDB)
 * 
 * This provides clear separation of concerns - audit logs are stored
 * in a dedicated time-series database optimized for audit trail queries.
 * 
 * Uses centralized environment configuration instead of direct process.env access.
 */
export const auditDbConfig: DataSourceOptions = {
    type: 'postgres',
    host: env.auditDb.host,
    port: env.auditDb.port,
    username: env.auditDb.username,
    password: env.auditDb.password,
    database: env.auditDb.name,
    schema: 'public',
    synchronize: false, // Never use synchronize in production
    logging: false,
    entities: [path.join(__dirname, 'audit-log.entity.{ts,js}')],
    migrations: [path.join(__dirname, '../migrations/audit-*.{ts,js}')],
};

