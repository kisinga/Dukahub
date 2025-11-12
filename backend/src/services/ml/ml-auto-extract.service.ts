import { Injectable, OnModuleInit } from '@nestjs/common';
import {
    AssetEvent,
    ChannelService,
    EventBus,
    ProductEvent,
    RequestContext,
} from '@vendure/core';
import { MlExtractionQueueService } from './ml-extraction-queue.service';
import { MlTrainingService } from './ml-training.service';

/**
 * ML Auto-Extract Service
 * 
 * Listens to product and asset events to automatically trigger photo extraction
 * when products are created or updated with new images.
 */
@Injectable()
export class MlAutoExtractService implements OnModuleInit {
    constructor(
        private eventBus: EventBus,
        private channelService: ChannelService,
        private extractionQueueService: MlExtractionQueueService,
        private mlTrainingService: MlTrainingService,
    ) { }

    onModuleInit() {
        // Listen to product events
        this.eventBus.ofType(ProductEvent).subscribe(async (event) => {
            if (event.type === 'created' || event.type === 'updated') {
                await this.handleProductChange(event.ctx, event.entity);
            }
        });

        // Listen to asset events
        this.eventBus.ofType(AssetEvent).subscribe(async (event) => {
            if (event.type === 'created' || event.type === 'updated') {
                await this.handleAssetChange(event.ctx, event.entity);
            }
        });

        console.log('[ML Auto-Extract] Event listeners initialized');
    }

    /**
     * Handle product creation/update events
     */
    private async handleProductChange(ctx: RequestContext, product: any): Promise<void> {
        try {
            // Get all channels this product belongs to
            const channels = await this.getProductChannels(ctx, product.id);

            for (const channel of channels) {
                await this.scheduleExtractionForChannel(ctx, channel.id);
            }
        } catch (error) {
            console.error('[ML Auto-Extract] Error handling product change:', error);
        }
    }

    /**
     * Handle asset creation/update events
     */
    private async handleAssetChange(ctx: RequestContext, asset: any): Promise<void> {
        try {
            // Check if asset is assigned to any products
            const products = await this.getAssetProducts(ctx, asset.id);

            for (const product of products) {
                const channels = await this.getProductChannels(ctx, product.id);

                for (const channel of channels) {
                    await this.scheduleExtractionForChannel(ctx, channel.id);
                }
            }
        } catch (error) {
            console.error('[ML Auto-Extract] Error handling asset change:', error);
        }
    }

    /**
     * Schedule extraction for a channel with database persistence
     */
    private async scheduleExtractionForChannel(ctx: RequestContext, channelId: string): Promise<void> {
        try {
            // Check if channel has ML enabled using shared utility
            const hasMlEnabled = await this.mlTrainingService.isMlEnabled(ctx, channelId);
            if (!hasMlEnabled) {
                console.log(`[ML Auto-Extract] Channel ${channelId} does not have ML enabled, skipping`);
                return;
            }

            // Check for recent pending extractions to prevent duplicates
            const hasRecent = await this.extractionQueueService.hasRecentPendingExtraction(ctx, channelId);
            if (hasRecent) {
                console.log(`[ML Auto-Extract] Channel ${channelId} already has a recent pending extraction, skipping duplicate`);
                return;
            }

            // Schedule extraction in database
            await this.extractionQueueService.scheduleExtraction(ctx, channelId, 5);
            console.log(`[ML Auto-Extract] Scheduled extraction for channel ${channelId} in database`);

        } catch (error) {
            console.error(`[ML Auto-Extract] Error scheduling extraction for channel ${channelId}:`, error);
        }
    }


    /**
     * Get all channels a product belongs to
     */
    private async getProductChannels(ctx: RequestContext, productId: string): Promise<any[]> {
        // This is a simplified implementation
        // In a real scenario, you'd query the product's channels through Vendure's relations
        const channels = await this.channelService.findAll(ctx);
        return channels.items;
    }

    /**
     * Get all products an asset is assigned to
     */
    private async getAssetProducts(ctx: RequestContext, assetId: string): Promise<any[]> {
        // This is a simplified implementation
        // In a real scenario, you'd query the asset's products through Vendure's relations
        return [];
    }

    /**
     * Manually trigger extraction for a channel (bypasses debouncing)
     * This schedules an immediate extraction (0 delay) in the queue
     */
    async triggerExtraction(ctx: RequestContext, channelId: string): Promise<void> {
        console.log(`[ML Auto-Extract] Manual trigger for channel ${channelId}`);
        // Schedule with 0 delay for immediate processing
        await this.extractionQueueService.scheduleExtraction(ctx, channelId, 0);
    }

    /**
     * Clear all pending extractions
     */
    async clearAllPending(): Promise<void> {
        try {
            // Cancel all pending extractions in the database
            const channels = await this.channelService.findAll(RequestContext.empty());
            for (const channel of channels.items) {
                await this.extractionQueueService.cancelPendingExtractions(RequestContext.empty(), channel.id.toString());
            }
            console.log('[ML Auto-Extract] Cleared all pending extractions from database');
        } catch (error) {
            console.error('[ML Auto-Extract] Error clearing pending extractions:', error);
        }
    }
}

