import { DataSourceOptions } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
const envPaths = [
    path.join(__dirname, '../../../configs/.env'),
    path.join(__dirname, '../../configs/.env'),
];
const envPath = envPaths.find(p => fs.existsSync(p));
if (envPath) {
    dotenvConfig({ path: envPath });
}

/**
 * Separate database connection configuration for audit logs (TimescaleDB)
 * 
 * This provides clear separation of concerns - audit logs are stored
 * in a dedicated time-series database optimized for audit trail queries.
 */
export const auditDbConfig: DataSourceOptions = {
    type: 'postgres',
    host: process.env.AUDIT_DB_HOST || 'timescaledb_audit',
    port: +(process.env.AUDIT_DB_PORT || 5432),
    username: process.env.AUDIT_DB_USERNAME || 'audit_user',
    password: process.env.AUDIT_DB_PASSWORD || 'audit_password',
    database: process.env.AUDIT_DB_NAME || 'audit_logs',
    schema: 'public',
    synchronize: false, // Never use synchronize in production
    logging: false,
    entities: [path.join(__dirname, 'audit-log.entity.{ts,js}')],
    migrations: [path.join(__dirname, '../migrations/audit-*.{ts,js}')],
};

