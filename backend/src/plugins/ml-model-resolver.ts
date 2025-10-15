import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
    Allow,
    AssetService,
    ChannelService,
    Ctx,
    ID,
    Permission,
    RequestContext,
    Transaction,
} from '@vendure/core';
import gql from 'graphql-tag';

/**
 * GraphQL schema extension for ML model management
 */
export const ML_MODEL_SCHEMA = gql`
    type MlModelInfo {
        hasModel: Boolean!
        version: String
        status: String
        modelJsonId: String
        modelBinId: String
        metadataId: String
    }

    extend type Query {
        """Get ML model info for a specific channel"""
        mlModelInfo(channelId: ID!): MlModelInfo!
    }

    extend type Mutation {
        """Link existing Asset IDs to channel (simpler than file upload)"""
        linkMlModelAssets(
            channelId: ID!
            modelJsonId: ID!
            modelBinId: ID!
            metadataId: ID!
        ): Boolean!
        
        """Set ML model status (active/inactive/training)"""
        setMlModelStatus(channelId: ID!, status: String!): Boolean!
        
        """Clear all ML model files for a channel"""
        clearMlModel(channelId: ID!): Boolean!
    }
`;

/**
 * ML Model Resolver - Using NestJS decorators per Vendure docs
 */
@Resolver()
export class MlModelResolver {
    constructor(
        private channelService: ChannelService,
        private assetService: AssetService,
    ) { }

    @Query()
    @Allow(Permission.ReadCatalog)
    async mlModelInfo(
        @Ctx() ctx: RequestContext,
        @Args() args: { channelId: ID },
    ): Promise<any> {
        const channel = await this.channelService.findOne(ctx, args.channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }

        const customFields = channel.customFields as any;

        return {
            hasModel: !!(customFields.mlModelJsonId && customFields.mlMetadataId),
            version: customFields.mlModelVersion || null,
            status: customFields.mlModelStatus || 'inactive',
            modelJsonId: customFields.mlModelJsonId || null,
            modelBinId: customFields.mlModelBinId || null,
            metadataId: customFields.mlMetadataId || null,
        };
    }

    @Transaction()
    @Mutation()
    @Allow(Permission.UpdateCatalog)
    async linkMlModelAssets(
        @Ctx() ctx: RequestContext,
        @Args() args: { channelId: ID; modelJsonId: ID; modelBinId: ID; metadataId: ID },
    ): Promise<boolean> {
        console.log('[ML Model] linkMlModelAssets called', args);

        const channel = await this.channelService.findOne(ctx, args.channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }

        // Verify assets exist
        const [modelJson, modelBin, metadata] = await Promise.all([
            this.assetService.findOne(ctx, args.modelJsonId),
            this.assetService.findOne(ctx, args.modelBinId),
            this.assetService.findOne(ctx, args.metadataId),
        ]);

        if (!modelJson || !modelBin || !metadata) {
            throw new Error('One or more assets not found');
        }

        const version = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');

        await this.channelService.update(ctx, {
            id: args.channelId,
            customFields: {
                ...channel.customFields,
                mlModelJsonId: args.modelJsonId,
                mlModelBinId: args.modelBinId,
                mlMetadataId: args.metadataId,
                mlModelVersion: version,
                mlModelStatus: 'active',
            },
        });

        console.log('[ML Model] Assets linked successfully');
        return true;
    }

    @Transaction()
    @Mutation()
    @Allow(Permission.UpdateCatalog)
    async setMlModelStatus(
        @Ctx() ctx: RequestContext,
        @Args() args: { channelId: ID; status: string },
    ): Promise<boolean> {
        const channel = await this.channelService.findOne(ctx, args.channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }

        const validStatuses = ['active', 'inactive', 'training'];
        if (!validStatuses.includes(args.status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }

        await this.channelService.update(ctx, {
            id: args.channelId,
            customFields: {
                ...channel.customFields,
                mlModelStatus: args.status,
            },
        });

        return true;
    }

    @Transaction()
    @Mutation()
    @Allow(Permission.DeleteCatalog)
    async clearMlModel(
        @Ctx() ctx: RequestContext,
        @Args() args: { channelId: ID },
    ): Promise<boolean> {
        const channel = await this.channelService.findOne(ctx, args.channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }

        await this.channelService.update(ctx, {
            id: args.channelId,
            customFields: {
                ...channel.customFields,
                mlModelJsonId: null,
                mlModelBinId: null,
                mlMetadataId: null,
                mlModelVersion: null,
                mlModelStatus: 'inactive',
            },
        });

        return true;
    }
}
