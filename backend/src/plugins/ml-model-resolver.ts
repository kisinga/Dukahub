import { Inject } from '@nestjs/common';
import { Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Args, Asset, AssetService, ChannelService, Ctx, Permission, PluginCommonModule, RequestContext, Transaction } from '@vendure/core';
import { gql } from 'apollo-server-core';

/**
 * GraphQL schema extension for ML model queries and mutations
 */
export const ML_MODEL_SCHEMA = gql`
    type MlModelInfo {
        hasModel: Boolean!
        version: String
        status: String
        trainedAt: String
        productCount: Int
        imageCount: Int
        labels: [String!]!
    }

    type MlModelFile {
        filename: String!
        url: String!
        size: Int!
        uploadedAt: DateTime!
    }

    extend type Channel {
        mlModelInfo: MlModelInfo!
        mlModelFiles: [MlModelFile!]!
    }

    extend type Mutation {
        uploadMlModelFiles(
            channelId: ID!
            modelJson: Upload!
            modelBin: Upload
            metadata: Upload!
        ): Boolean!
        deleteMlModel(channelId: ID!): Boolean!
        activateMlModel(channelId: ID!): Boolean!
        deactivateMlModel(channelId: ID!): Boolean!
    }
`;

/**
 * ML Model Resolver
 */
@Resolver()
export class MlModelResolver {
    constructor(
        @Inject(ChannelService) private channelService: ChannelService,
        @Inject(AssetService) private assetService: AssetService,
    ) {}

    @Query()
    @Allow(Permission.ReadCatalog)
    async mlModelInfo(@Ctx() ctx: RequestContext, @Args('channelId') channelId: string) {
        const channel = await this.channelService.findOne(ctx, channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }

        const customFields = channel.customFields as any;
        const metadataAsset = customFields.mlMetadata;

        let metadata = null;
        if (metadataAsset) {
            try {
                const fs = require('fs');
                const path = require('path');
                const metadataPath = path.join(process.cwd(), 'static', 'assets', metadataAsset.source);
                if (fs.existsSync(metadataPath)) {
                    const metadataContent = fs.readFileSync(metadataPath, 'utf8');
                    metadata = JSON.parse(metadataContent);
                }
            } catch (error) {
                console.error('Error reading ML model metadata:', error);
            }
        }

        return {
            hasModel: !!(customFields.mlModelJson && customFields.mlMetadata),
            version: customFields.mlModelVersion || null,
            status: customFields.mlModelStatus || 'inactive',
            trainedAt: metadata?.trainedAt || null,
            productCount: metadata?.productCount || 0,
            imageCount: metadata?.imageCount || 0,
            labels: metadata?.labels || [],
        };
    }

    @Query()
    @Allow(Permission.ReadCatalog)
    async mlModelFiles(@Ctx() ctx: RequestContext, @Args('channelId') channelId: string) {
        const channel = await this.channelService.findOne(ctx, channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }

        const customFields = channel.customFields as any;
        const files: any[] = [];

        // Add model JSON file
        if (customFields.mlModelJson) {
            files.push({
                filename: 'model.json',
                url: `/admin-api/ml-models/${channelId}/model.json`,
                size: customFields.mlModelJson.size,
                uploadedAt: customFields.mlModelJson.createdAt,
            });
        }

        // Add metadata file
        if (customFields.mlMetadata) {
            files.push({
                filename: 'metadata.json',
                url: `/admin-api/ml-models/${channelId}/metadata.json`,
                size: customFields.mlMetadata.size,
                uploadedAt: customFields.mlMetadata.createdAt,
            });
        }

        return files;
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.UpdateCatalog)
    async uploadMlModelFiles(
        @Ctx() ctx: RequestContext,
        @Args('channelId') channelId: string,
        @Args('modelJson') modelJson: any,
        @Args('modelBin') modelBin: any,
        @Args('metadata') metadata: any,
    ): Promise<boolean> {
        const channel = await this.channelService.findOne(ctx, channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }

        // Process model.json file
        if (modelJson) {
            const modelJsonAsset = await this.assetService.create(ctx, {
                file: modelJson,
                tags: [{ name: 'ml-model', value: 'model-json' }],
            });

            // Update channel custom field
            await this.channelService.update(ctx, {
                id: channelId,
                customFields: {
                    ...channel.customFields,
                    mlModelJson: modelJsonAsset,
                    mlModelVersion: this.generateVersion(),
                    mlModelStatus: 'active',
                },
            });
        }

        // Process metadata file
        if (metadata) {
            const metadataAsset = await this.assetService.create(ctx, {
                file: metadata,
                tags: [{ name: 'ml-model', value: 'metadata' }],
            });

            // Update channel custom field
            await this.channelService.update(ctx, {
                id: channelId,
                customFields: {
                    ...channel.customFields,
                    mlMetadata: metadataAsset,
                },
            });
        }

        return true;
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.UpdateCatalog)
    async deleteMlModel(@Ctx() ctx: RequestContext, @Args('channelId') channelId: string): Promise<boolean> {
        const channel = await this.channelService.findOne(ctx, channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }

        await this.channelService.update(ctx, {
            id: channelId,
            customFields: {
                ...channel.customFields,
                mlModelJson: null,
                mlModelBin: null,
                mlMetadata: null,
                mlModelVersion: null,
                mlModelStatus: 'inactive',
            },
        });

        return true;
    }

    @Mutation()
    @Allow(Permission.UpdateCatalog)
    async activateMlModel(@Ctx() ctx: RequestContext, @Args('channelId') channelId: string): Promise<boolean> {
        const channel = await this.channelService.findOne(ctx, channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }

        await this.channelService.update(ctx, {
            id: channelId,
            customFields: {
                ...channel.customFields,
                mlModelStatus: 'active',
            },
        });

        return true;
    }

    @Mutation()
    @Allow(Permission.UpdateCatalog)
    async deactivateMlModel(@Ctx() ctx: RequestContext, @Args('channelId') channelId: string): Promise<boolean> {
        const channel = await this.channelService.findOne(ctx, channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }

        await this.channelService.update(ctx, {
            id: channelId,
            customFields: {
                ...channel.customFields,
                mlModelStatus: 'inactive',
            },
        });

        return true;
    }

    private generateVersion(): string {
        return new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    }
}
