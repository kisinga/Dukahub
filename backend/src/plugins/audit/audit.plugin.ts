import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { VENDURE_COMPATIBILITY_VERSION } from '../../constants/vendure-version.constants';
import { AuditDbConnection } from '../../infrastructure/audit/audit-db.connection';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { UserContextResolver } from '../../infrastructure/audit/user-context.resolver';
import { VendureEventAuditSubscriber } from '../../infrastructure/audit/vendure-events.subscriber';
import { AuditResolver, auditSchema } from './audit.resolver';

/**
 * Audit Plugin
 *
 * Provides comprehensive audit logging for all sensitive operations.
 * Uses a separate TimescaleDB database for audit logs with automatic
 * retention policies (2 years).
 *
 * Exports AuditService for use in other services.
 * Provides GraphQL API for querying audit logs.
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [
    AuditDbConnection, // Must be first - initializes the separate DB connection
    AuditService,
    UserContextResolver,
    VendureEventAuditSubscriber,
    AuditResolver,
  ],
  adminApiExtensions: {
    schema: auditSchema,
    resolvers: [AuditResolver],
  },
  exports: [
    AuditService, // Export for use in other services
    AuditDbConnection, // Export so other plugins can use the same instance
    UserContextResolver, // Export for consistency
  ],
  compatibility: VENDURE_COMPATIBILITY_VERSION,
})
export class AuditPlugin {}
