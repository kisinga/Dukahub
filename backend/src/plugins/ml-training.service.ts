import { Injectable } from '@nestjs/common';
import {
    AssetService,
    ChannelService,
    ProductService,
    RequestContext,
    TransactionalConnection,
} from '@vendure/core';
import { MlWebhookService } from './ml-webhook.service';

export interface ProductManifestEntry {
    productId: string;
    productName: string;
    images: ImageManifestEntry[];
}

export interface ImageManifestEntry {
    assetId: string;
    url: string;
    filename: string;
}

export interface TrainingManifest {
    channelId: string;
    version: string;
    extractedAt: Date;
    products: ProductManifestEntry[];
}

/**
 * ML Training Service
 * 
 * Handles photo extraction and training manifest generation for ML models.
 * Provides methods for extracting product photos and generating training manifests.
 */
@Injectable()
export class MlTrainingService {
    constructor(
        private channelService: ChannelService,
        private productService: ProductService,
        private assetService: AssetService,
        private connection: TransactionalConnection,
        private webhookService: MlWebhookService,
    ) { }

    /**
     * Extract photos for a channel and generate training manifest
     */
    async extractPhotosForChannel(ctx: RequestContext, channelId: string): Promise<TrainingManifest> {
        console.log(`[ML Training] Extracting photos for channel ${channelId}`);

        // Update status to extracting
        await this.updateTrainingStatus(ctx, channelId, 'extracting', 0);

        // Send webhook notification
        await this.webhookService.notifyTrainingStarted(ctx, channelId);

        try {
            // Query all products for the channel
            const products = await this.productService.findAll(ctx, {
                take: 1000, // Reasonable limit
            });

            const manifestProducts: ProductManifestEntry[] = [];
            let totalImageCount = 0;

            for (const product of products.items) {
                // Get assets for this product
                const productWithAssets = await this.productService.findOne(ctx, product.id, ['assets']);
                if (!productWithAssets?.assets || productWithAssets.assets.length === 0) {
                    continue; // Skip products without images
                }

                const images: ImageManifestEntry[] = [];

                for (const asset of productWithAssets.assets) {
                    // Generate public URL for the asset
                    const publicUrl = this.generateAssetUrl(asset.asset.source);

                    images.push({
                        assetId: asset.asset.id.toString(),
                        url: publicUrl,
                        filename: asset.asset.name,
                    });
                }

                if (images.length > 0) {
                    manifestProducts.push({
                        productId: product.id.toString(),
                        productName: product.name,
                        images,
                    });
                    totalImageCount += images.length;
                }
            }

            const manifest: TrainingManifest = {
                channelId,
                version: new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-'),
                extractedAt: new Date(),
                products: manifestProducts,
            };

            // Update channel with extracted stats
            await this.channelService.update(ctx, {
                id: channelId,
                customFields: {
                    mlProductCount: manifestProducts.length,
                    mlImageCount: totalImageCount,
                },
            });

            // Update status to ready
            await this.updateTrainingStatus(ctx, channelId, 'ready', 100);

            // Send webhook notification
            await this.webhookService.notifyTrainingReady(ctx, channelId);

            console.log(`[ML Training] Extracted ${manifestProducts.length} products with ${totalImageCount} images`);
            return manifest;

        } catch (error) {
            console.error(`[ML Training] Error extracting photos for channel ${channelId}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.updateTrainingStatus(ctx, channelId, 'failed', 0, errorMessage);

            // Send webhook notification
            await this.webhookService.notifyTrainingFailed(ctx, channelId, errorMessage);

            throw error;
        }
    }

    /**
     * Get training manifest for a channel
     */
    async getTrainingManifest(ctx: RequestContext, channelId: string): Promise<TrainingManifest> {
        const channel = await this.channelService.findOne(ctx, channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }

        const customFields = channel.customFields as any;

        // Check if we have recent extraction data
        if (customFields.mlProductCount > 0) {
            // Return cached manifest (in a real implementation, you might store this)
            return this.extractPhotosForChannel(ctx, channelId);
        }

        // No cached data, extract now
        return this.extractPhotosForChannel(ctx, channelId);
    }

    /**
     * Update training status for a channel
     */
    async updateTrainingStatus(
        ctx: RequestContext,
        channelId: string,
        status: string,
        progress: number = 0,
        error?: string,
    ): Promise<void> {
        const updateData: any = {
            mlTrainingStatus: status,
            mlTrainingProgress: progress,
        };

        if (status === 'training' && !error) {
            updateData.mlTrainingStartedAt = new Date();
        }

        if (error) {
            updateData.mlTrainingError = error;
        }

        await this.channelService.update(ctx, {
            id: channelId,
            customFields: updateData,
        });

        console.log(`[ML Training] Updated channel ${channelId} status to ${status} (${progress}%)`);
    }

    /**
     * Schedule auto-extraction for a channel (debounced)
     */
    async scheduleAutoExtraction(ctx: RequestContext, channelId: string): Promise<void> {
        // In a real implementation, you would use Vendure's job queue
        // For now, we'll just trigger extraction immediately
        console.log(`[ML Training] Scheduling auto-extraction for channel ${channelId}`);

        // Check if channel has ML enabled (has previous model or training in progress)
        const channel = await this.channelService.findOne(ctx, channelId);
        if (!channel) return;

        const customFields = channel.customFields as any;
        const hasMlEnabled = customFields.mlModelJsonId ||
            customFields.mlTrainingStatus === 'training' ||
            customFields.mlTrainingStatus === 'ready';

        if (hasMlEnabled) {
            // Trigger extraction
            await this.extractPhotosForChannel(ctx, channelId);
        }
    }

    /**
     * Generate public URL for an asset
     */
    private generateAssetUrl(source: string): string {
        // In production, this would use the actual asset server URL
        // For now, return a placeholder that would work with AssetServerPlugin
        const baseUrl = process.env.ASSET_URL_PREFIX || 'http://localhost:3000/assets';
        return `${baseUrl}/${source}`;
    }

    /**
     * Get training info for a channel
     */
    async getTrainingInfo(ctx: RequestContext, channelId: string): Promise<any> {
        const channel = await this.channelService.findOne(ctx, channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }

        const customFields = channel.customFields as any;

        return {
            status: customFields.mlTrainingStatus || 'idle',
            progress: customFields.mlTrainingProgress || 0,
            startedAt: customFields.mlTrainingStartedAt,
            error: customFields.mlTrainingError,
            productCount: customFields.mlProductCount || 0,
            imageCount: customFields.mlImageCount || 0,
            hasActiveModel: !!(customFields.mlModelJsonId && customFields.mlMetadataId),
            lastTrainedAt: customFields.mlTrainingStartedAt, // Could be improved with separate field
        };
    }
}
