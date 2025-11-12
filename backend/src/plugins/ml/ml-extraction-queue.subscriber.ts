import { Injectable, OnModuleInit } from '@nestjs/common';
import { RequestContext } from '@vendure/core';
import { MlExtractionQueueService } from '../../services/ml/ml-extraction-queue.service';
import { MlTrainingService } from '../../services/ml/ml-training.service';

/**
 * ML Extraction Queue Subscriber
 * 
 * Handles processing of due extractions from the queue.
 * Replaces the polling mechanism with event-driven processing.
 */
@Injectable()
export class MlExtractionQueueSubscriber implements OnModuleInit {
    private processingInterval: NodeJS.Timeout | null = null;

    constructor(
        private extractionQueueService: MlExtractionQueueService,
        private mlTrainingService: MlTrainingService,
    ) { }

    onModuleInit(): void {
        // Start processing queue every 30 seconds
        // This is still needed to check for due extractions, but now it's
        // in a dedicated subscriber rather than mixed with event handling
        this.startQueueProcessor();

        // Clean up old extractions on startup (with delay to ensure migrations complete)
        setTimeout(() => {
            this.cleanupOldExtractions();
        }, 5000); // 5 second delay to allow migrations to complete

        console.log('[ML Extraction Queue Subscriber] Initialized');
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
                console.error('[ML Extraction Queue Subscriber] Error processing queue:', error);
            }
        }, 30000);

        console.log('[ML Extraction Queue Subscriber] Queue processor started (30s interval)');
    }

    /**
     * Process due extractions from the queue
     */
    private async processQueue(): Promise<void> {
        try {
            console.log('[ML Extraction Queue Subscriber] Checking for due extractions...');
            const dueExtractions = await this.extractionQueueService.getDueExtractions(RequestContext.empty());

            if (dueExtractions.length === 0) {
                console.log('[ML Extraction Queue Subscriber] No extractions to process (this is normal when no products have been updated recently)');
                return;
            }

            console.log(`[ML Extraction Queue Subscriber] Processing ${dueExtractions.length} due extractions`);
            for (const extraction of dueExtractions) {
                try {
                    console.log(`[ML Extraction Queue Subscriber] Processing extraction ${extraction.id} for channel ${extraction.channelId}`);

                    // Mark as processing (this will emit ML_EXTRACTION_STARTED event)
                    await this.extractionQueueService.markAsProcessing(RequestContext.empty(), extraction.id);

                    // Perform the extraction
                    await this.mlTrainingService.scheduleAutoExtraction(RequestContext.empty(), extraction.channelId);

                    // Mark as completed (this will emit ML_EXTRACTION_COMPLETED event)
                    await this.extractionQueueService.markAsCompleted(RequestContext.empty(), extraction.id);

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    console.error(`[ML Extraction Queue Subscriber] Error processing extraction ${extraction.id}:`, error);
                    // Mark as failed (this will emit ML_EXTRACTION_FAILED event)
                    await this.extractionQueueService.markAsFailed(RequestContext.empty(), extraction.id, errorMessage);
                }
            }
        } catch (error) {
            console.error('[ML Extraction Queue Subscriber] Error getting due extractions:', error);
        }
    }

    /**
     * Clean up old extractions on startup
     */
    private async cleanupOldExtractions(): Promise<void> {
        try {
            const cleanedCount = await this.extractionQueueService.cleanupOldExtractions(RequestContext.empty());
            if (cleanedCount > 0) {
                console.log(`[ML Extraction Queue Subscriber] Cleaned up ${cleanedCount} old extractions on startup`);
            }
        } catch (error) {
            console.error('[ML Extraction Queue Subscriber] Error cleaning up old extractions:', error);
        }
    }
}

