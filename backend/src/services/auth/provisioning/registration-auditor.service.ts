import { Injectable, Logger, Optional } from '@nestjs/common';
import { RequestContext } from '@vendure/core';
import { AuditService } from '../../../infrastructure/audit/audit.service';

/**
 * Registration Auditor Service
 * 
 * Centralized audit logging for registration provisioning steps.
 * Wraps AuditService with safe error handling (non-blocking).
 */
@Injectable()
export class RegistrationAuditorService {
    private readonly logger = new Logger(RegistrationAuditorService.name);

    constructor(
        @Optional() private readonly auditService?: AuditService,
    ) { }

    /**
     * Log entity creation audit event
     * Non-blocking: failures are logged as warnings but don't throw
     */
    async logEntityCreated<T extends { id: string | number }>(
        ctx: RequestContext,
        entityType: string,
        entityId: string,
        entity: T,
        additionalData?: Record<string, any>
    ): Promise<void> {
        if (!this.auditService) {
            return;
        }

        await this.auditService.log(ctx, `${entityType.toLowerCase()}.created`, {
            entityType,
            entityId: entityId.toString(),
            data: {
                ...this.extractEntityFields(entity),
                ...additionalData,
            },
        }).catch((err: unknown) => {
            this.logger.warn(
                `Failed to log ${entityType} created audit: ` +
                `${err instanceof Error ? err.message : String(err)}`
            );
        });
    }

    /**
     * Extract relevant fields from entity for audit log
     */
    private extractEntityFields(entity: any): Record<string, any> {
        // Extract common fields that are safe to log
        const fields: Record<string, any> = {};

        if (entity.code) fields.code = entity.code;
        if (entity.token) fields.token = entity.token;
        if (entity.name) fields.name = entity.name;
        if (entity.description) fields.description = entity.description;
        if (entity.emailAddress) fields.emailAddress = entity.emailAddress;
        if (entity.identifier) fields.identifier = entity.identifier;
        if (entity.firstName) fields.firstName = entity.firstName;
        if (entity.lastName) fields.lastName = entity.lastName;
        if (entity.permissions) fields.permissionCount = Array.isArray(entity.permissions) ? entity.permissions.length : 0;

        return fields;
    }
}

