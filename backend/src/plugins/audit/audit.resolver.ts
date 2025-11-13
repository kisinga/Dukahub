import { Args, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';
import { gql } from 'graphql-tag';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { AuditTrailFilters } from '../../infrastructure/audit/audit.types';
import { AuditLog } from '../../infrastructure/audit/audit-log.entity';

export const auditSchema = gql`
    extend type Query {
        auditLogs(options: AuditLogOptions): [AuditLog!]!
    }

    type AuditLog {
        id: ID!
        timestamp: DateTime!
        channelId: ID!
        eventType: String!
        entityType: String
        entityId: String
        userId: ID
        data: JSON!
        source: String!
    }

    input AuditLogOptions {
        entityType: String
        entityId: String
        userId: ID
        eventType: String
        startDate: DateTime
        endDate: DateTime
        limit: Int
        skip: Int
    }
`;

@Resolver()
export class AuditResolver {
    constructor(private readonly auditService: AuditService) {}

    @Query()
    @Allow(Permission.ReadSettings) // Requires admin authentication
    async auditLogs(
        @Ctx() ctx: RequestContext,
        @Args('options') options?: {
            entityType?: string;
            entityId?: string;
            userId?: string;
            eventType?: string;
            startDate?: Date;
            endDate?: Date;
            limit?: number;
            skip?: number;
        }
    ): Promise<AuditLog[]> {
        // Build filters from options
        const filters: AuditTrailFilters & { limit?: number; skip?: number } = {};
        
        if (options?.entityType) {
            filters.entityType = options.entityType;
        }
        
        if (options?.entityId) {
            filters.entityId = options.entityId;
        }
        
        if (options?.userId) {
            filters.userId = options.userId;
        }
        
        if (options?.eventType) {
            filters.eventType = options.eventType;
        }
        
        if (options?.startDate) {
            filters.startDate = options.startDate instanceof Date 
                ? options.startDate 
                : new Date(options.startDate);
        }
        
        if (options?.endDate) {
            filters.endDate = options.endDate instanceof Date 
                ? options.endDate 
                : new Date(options.endDate);
        }

        // Add pagination to filters (handled at database level for better performance)
        if (options?.skip !== undefined) {
            filters.skip = options.skip;
        }
        
        if (options?.limit !== undefined) {
            filters.limit = options.limit;
        }

        // Get audit logs (automatically filtered by channel from RequestContext)
        return await this.auditService.getAuditTrail(ctx, filters);
    }
}

