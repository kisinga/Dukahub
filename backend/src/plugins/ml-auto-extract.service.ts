import { Injectable, OnModuleInit } from '@nestjs/common';
import {
    AssetEvent,
    ChannelService,
    EventBus,
    ProductEvent,
    RequestContext,
    TransactionalConnection,
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
    private processingInterval: NodeJS.Timeout | null = null;

    constructor(
        private eventBus: EventBus,
        private mlTrainingService: MlTrainingService,
        private channelService: ChannelService,
        private connection: TransactionalConnection,
        private extractionQueueService: MlExtractionQueueService,
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

        // Start processing queue every 30 seconds
        this.startQueueProcessor();

        // Clean up old extractions on startup (with delay to ensure migrations complete)
        setTimeout(() => {
            this.cleanupOldExtractions();
        }, 5000); // 5 second delay to allow migrations to complete
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
     * Start the queue processor to handle due extractions
     */
    private startQueueProcessor(): void {
        // Process queue every 30 seconds
        this.processingInterval = setInterval(async () => {
            try {
                await this.processQueue();
            } catch (error) {
                console.error('[ML Auto-Extract] Error processing queue:', error);
            }
        }, 30000);

        console.log('[ML Auto-Extract] Queue processor started (30s interval)');
    }

    /**
     * Process due extractions from the queue
     */
    private async processQueue(): Promise<void> {
        try {
            console.log('[ML Auto-Extract] Checking for due extractions...');
            const dueExtractions = await this.extractionQueueService.getDueExtractions(RequestContext.empty());

            if (dueExtractions.length === 0) {
                console.log('[ML Auto-Extract] No extractions to process (this is normal when no products have been updated recently)');
                return;
            }

            console.log(`[ML Auto-Extract] Processing ${dueExtractions.length} due extractions`);
            for (const extraction of dueExtractions) {
                try {
                    console.log(`[ML Auto-Extract] Processing extraction ${extraction.id} for channel ${extraction.channelId}`);

                    // Mark as processing
                    await this.extractionQueueService.markAsProcessing(RequestContext.empty(), extraction.id);

                    // Perform the extraction
                    await this.mlTrainingService.scheduleAutoExtraction(RequestContext.empty(), extraction.channelId);

                    // Mark as completed
                    await this.extractionQueueService.markAsCompleted(RequestContext.empty(), extraction.id);

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    console.error(`[ML Auto-Extract] Error processing extraction ${extraction.id}:`, error);
                    await this.extractionQueueService.markAsFailed(RequestContext.empty(), extraction.id, errorMessage);
                }
            }
        } catch (error) {
            console.error('[ML Auto-Extract] Error getting due extractions:', error);
        }
    }

    /**
     * Clean up old extractions on startup
     */
    private async cleanupOldExtractions(): Promise<void> {
        try {
            const cleanedCount = await this.extractionQueueService.cleanupOldExtractions(RequestContext.empty());
            if (cleanedCount > 0) {
                console.log(`[ML Auto-Extract] Cleaned up ${cleanedCount} old extractions on startup`);
            }
        } catch (error) {
            console.error('[ML Auto-Extract] Error cleaning up old extractions:', error);
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
     */
    async triggerExtraction(ctx: RequestContext, channelId: string): Promise<void> {
        console.log(`[ML Auto-Extract] Manual trigger for channel ${channelId}`);
        await this.mlTrainingService.scheduleAutoExtraction(ctx, channelId);
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

