import { Injectable, OnModuleInit } from '@nestjs/common';
import {
    AssetEvent,
    ChannelService,
    EventBus,
    ProductEvent,
    RequestContext,
    TransactionalConnection,
} from '@vendure/core';
import { MlTrainingService } from './ml-training.service';

/**
 * ML Auto-Extract Service
 * 
 * Listens to product and asset events to automatically trigger photo extraction
 * when products are created or updated with new images.
 */
@Injectable()
export class MlAutoExtractService implements OnModuleInit {
    private extractionQueue = new Map<string, NodeJS.Timeout>();

    constructor(
        private eventBus: EventBus,
        private mlTrainingService: MlTrainingService,
        private channelService: ChannelService,
        private connection: TransactionalConnection,
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
     * Schedule extraction for a channel with debouncing
     */
    private async scheduleExtractionForChannel(ctx: RequestContext, channelId: string): Promise<void> {
        // Clear existing timeout for this channel
        const existingTimeout = this.extractionQueue.get(channelId);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        // Check if channel has ML enabled
        const channel = await this.channelService.findOne(ctx, channelId);
        if (!channel) return;

        const customFields = channel.customFields as any;
        const hasMlEnabled = customFields.mlModelJsonId ||
            customFields.mlTrainingStatus === 'training' ||
            customFields.mlTrainingStatus === 'ready' ||
            customFields.mlTrainingStatus === 'active';

        if (!hasMlEnabled) {
            console.log(`[ML Auto-Extract] Channel ${channelId} does not have ML enabled, skipping`);
            return;
        }

        // Schedule extraction with 5-minute debounce
        const timeout = setTimeout(async () => {
            try {
                console.log(`[ML Auto-Extract] Triggering extraction for channel ${channelId}`);
                await this.mlTrainingService.scheduleAutoExtraction(ctx, channelId);
            } catch (error) {
                console.error(`[ML Auto-Extract] Error during extraction for channel ${channelId}:`, error);
            } finally {
                this.extractionQueue.delete(channelId);
            }
        }, 5 * 60 * 1000); // 5 minutes

        this.extractionQueue.set(channelId, timeout);
        console.log(`[ML Auto-Extract] Scheduled extraction for channel ${channelId} in 5 minutes`);
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
     */
    async triggerExtraction(ctx: RequestContext, channelId: string): Promise<void> {
        console.log(`[ML Auto-Extract] Manual trigger for channel ${channelId}`);
        await this.mlTrainingService.scheduleAutoExtraction(ctx, channelId);
    }

    /**
     * Clear all pending extractions
     */
    clearAllPending(): void {
        for (const [channelId, timeout] of this.extractionQueue) {
            clearTimeout(timeout);
        }
        this.extractionQueue.clear();
        console.log('[ML Auto-Extract] Cleared all pending extractions');
    }
}

