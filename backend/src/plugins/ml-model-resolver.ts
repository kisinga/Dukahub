import {
    Allow,
    Asset,
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
        modelJson: Asset
        modelBin: Asset
        metadata: Asset
    }

    extend type Query {
        """Get ML model info for a specific channel"""
        mlModelInfo(channelId: ID!): MlModelInfo!
    }

    extend type Mutation {
        """Upload ML model file (model.json, weights.bin, or metadata.json)"""
        uploadMlModelFile(channelId: ID!, file: Upload!, fileType: String!): Asset!
        
        """Set ML model status (active/inactive/training)"""
        setMlModelStatus(channelId: ID!, status: String!): Boolean!
        
        """Clear all ML model files for a channel"""
        clearMlModel(channelId: ID!): Boolean!
    }
`;

/**
 * ML Model Resolver - KISS implementation using Vendure's Asset system
 */
export class MlModelResolver {
    constructor(
        private channelService: ChannelService,
        private assetService: AssetService,
    ) { }

    @Allow(Permission.ReadCatalog)
    async mlModelInfo(
        @Ctx() ctx: RequestContext,
        args: { channelId: ID },
    ): Promise<any> {
        const channel = await this.channelService.findOne(ctx, args.channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }

        const customFields = channel.customFields as any;

        // Fetch Asset entities by ID if they exist
        const modelJson = customFields.mlModelJsonId
            ? await this.assetService.findOne(ctx, customFields.mlModelJsonId)
            : null;
        const modelBin = customFields.mlModelBinId
            ? await this.assetService.findOne(ctx, customFields.mlModelBinId)
            : null;
        const metadata = customFields.mlMetadataId
            ? await this.assetService.findOne(ctx, customFields.mlMetadataId)
            : null;

        return {
            hasModel: !!(modelJson && metadata),
            version: customFields.mlModelVersion || null,
            status: customFields.mlModelStatus || 'inactive',
            modelJson,
            modelBin,
            metadata,
        };
    }

    @Transaction()
    @Allow(Permission.UpdateCatalog)
    async uploadMlModelFile(
        @Ctx() ctx: RequestContext,
        args: { channelId: ID; file: any; fileType: string },
    ): Promise<Asset> {
        const channel = await this.channelService.findOne(ctx, args.channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }

        // Create asset using Vendure's AssetService
        const assetResult = await this.assetService.create(ctx, {
            file: args.file,
            tags: ['ml-model', `channel-${args.channelId}`, `type-${args.fileType}`],
        });

        // Handle potential errors
        if ('message' in assetResult) {
            throw new Error(`Failed to create asset: ${assetResult.message}`);
        }

        const asset = assetResult;

        // Determine which custom field to update
        const customFieldUpdates: any = {
            ...channel.customFields,
        };

        switch (args.fileType) {
            case 'model':
                customFieldUpdates.mlModelJsonId = asset.id;
                customFieldUpdates.mlModelVersion = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
                break;
            case 'binary':
                customFieldUpdates.mlModelBinId = asset.id;
                break;
            case 'metadata':
                customFieldUpdates.mlMetadataId = asset.id;
                break;
            default:
                throw new Error(`Invalid file type: ${args.fileType}. Use 'model', 'binary', or 'metadata'`);
        }

        // Update channel
        await this.channelService.update(ctx, {
            id: args.channelId,
            customFields: customFieldUpdates,
        });

        return asset as Asset;
    }

    @Transaction()
    @Allow(Permission.UpdateCatalog)
    async setMlModelStatus(
        @Ctx() ctx: RequestContext,
        args: { channelId: ID; status: string },
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
    @Allow(Permission.DeleteCatalog)
    async clearMlModel(
        @Ctx() ctx: RequestContext,
        args: { channelId: ID },
    ): Promise<boolean> {
        const channel = await this.channelService.findOne(ctx, args.channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }

        // Optionally delete the assets (commented out to keep assets in system)
        // const customFields = channel.customFields as any;
        // if (customFields.mlModelJsonId) await this.assetService.delete(ctx, [customFields.mlModelJsonId]);
        // if (customFields.mlModelBinId) await this.assetService.delete(ctx, [customFields.mlModelBinId]);
        // if (customFields.mlMetadataId) await this.assetService.delete(ctx, [customFields.mlMetadataId]);

        // Clear references
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
