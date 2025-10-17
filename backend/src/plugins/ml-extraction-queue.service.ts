import { Injectable } from '@nestjs/common';
import { RequestContext, TransactionalConnection } from '@vendure/core';

export interface ScheduledExtraction {
    id: string;
    channelId: string;
    scheduledAt: Date;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt: Date;
    updatedAt: Date;
    error?: string;
}

/**
 * ML Extraction Queue Service
 * 
 * Manages persistent storage of scheduled extractions to handle
 * backend restarts and ensure no extractions are lost.
 */
@Injectable()
export class MlExtractionQueueService {
    constructor(private connection: TransactionalConnection) { }

    /**
     * Schedule a new extraction for a channel
     */
    async scheduleExtraction(ctx: RequestContext, channelId: string, delayMinutes: number = 5): Promise<string> {
        const scheduledAt = new Date(Date.now() + (delayMinutes * 60 * 1000));

        const result = await this.connection.rawConnection.query(`
            INSERT INTO ml_extraction_queue (channel_id, scheduled_at, status, created_at, updated_at)
            VALUES ($1, $2, 'pending', NOW(), NOW())
            RETURNING id
        `, [channelId, scheduledAt]);

        const extractionId = result.rows[0].id;
        console.log(`[ML Extraction Queue] Scheduled extraction ${extractionId} for channel ${channelId} at ${scheduledAt.toISOString()}`);

        return extractionId;
    }

    /**
     * Check if a channel has a recent pending extraction (within 30 seconds)
     */
    async hasRecentPendingExtraction(ctx: RequestContext, channelId: string): Promise<boolean> {
        const result = await this.connection.rawConnection.query(`
            SELECT id FROM ml_extraction_queue 
            WHERE channel_id = $1 
            AND status = 'pending' 
            AND created_at > NOW() - INTERVAL '30 seconds'
            LIMIT 1
        `, [channelId]);

        return result.rows.length > 0;
    }

    /**
     * Get all pending extractions that are due for processing
     */
    async getDueExtractions(ctx: RequestContext): Promise<ScheduledExtraction[]> {
        const result = await this.connection.rawConnection.query(`
            SELECT id, channel_id, scheduled_at, status, created_at, updated_at, error
            FROM ml_extraction_queue 
            WHERE status = 'pending' 
            AND scheduled_at <= NOW()
            ORDER BY scheduled_at ASC
        `);

        return result.rows.map((row: any) => ({
            id: row.id,
            channelId: row.channel_id,
            scheduledAt: new Date(row.scheduled_at),
            status: row.status,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            error: row.error,
        }));
    }

    /**
     * Mark an extraction as processing
     */
    async markAsProcessing(ctx: RequestContext, extractionId: string): Promise<void> {
        await this.connection.rawConnection.query(`
            UPDATE ml_extraction_queue 
            SET status = 'processing', updated_at = NOW()
            WHERE id = $1
        `, [extractionId]);

        console.log(`[ML Extraction Queue] Marked extraction ${extractionId} as processing`);
    }

    /**
     * Mark an extraction as completed
     */
    async markAsCompleted(ctx: RequestContext, extractionId: string): Promise<void> {
        await this.connection.rawConnection.query(`
            UPDATE ml_extraction_queue 
            SET status = 'completed', updated_at = NOW()
            WHERE id = $1
        `, [extractionId]);

        console.log(`[ML Extraction Queue] Marked extraction ${extractionId} as completed`);
    }

    /**
     * Mark an extraction as failed
     */
    async markAsFailed(ctx: RequestContext, extractionId: string, error: string): Promise<void> {
        await this.connection.rawConnection.query(`
            UPDATE ml_extraction_queue 
            SET status = 'failed', error = $2, updated_at = NOW()
            WHERE id = $1
        `, [extractionId, error]);

        console.log(`[ML Extraction Queue] Marked extraction ${extractionId} as failed: ${error}`);
    }

    /**
     * Clean up old completed extractions (older than 7 days)
     */
    async cleanupOldExtractions(ctx: RequestContext): Promise<number> {
        const result = await this.connection.rawConnection.query(`
            DELETE FROM ml_extraction_queue 
            WHERE status IN ('completed', 'failed') 
            AND updated_at < NOW() - INTERVAL '7 days'
        `);

        const deletedCount = result.rowCount || 0;
        if (deletedCount > 0) {
            console.log(`[ML Extraction Queue] Cleaned up ${deletedCount} old extractions`);
        }

        return deletedCount;
    }

    /**
     * Get extraction history for a channel
     */
    async getChannelHistory(ctx: RequestContext, channelId: string, limit: number = 10): Promise<ScheduledExtraction[]> {
        const result = await this.connection.rawConnection.query(`
            SELECT id, channel_id, scheduled_at, status, created_at, updated_at, error
            FROM ml_extraction_queue 
            WHERE channel_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        `, [channelId, limit]);

        return result.rows.map((row: any) => ({
            id: row.id,
            channelId: row.channel_id,
            scheduledAt: new Date(row.scheduled_at),
            status: row.status,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            error: row.error,
        }));
    }

    /**
     * Cancel pending extractions for a channel
     */
    async cancelPendingExtractions(ctx: RequestContext, channelId: string): Promise<number> {
        const result = await this.connection.rawConnection.query(`
            UPDATE ml_extraction_queue 
            SET status = 'failed', error = 'Cancelled by user', updated_at = NOW()
            WHERE channel_id = $1 AND status = 'pending'
        `, [channelId]);

        const cancelledCount = result.rowCount || 0;
        if (cancelledCount > 0) {
            console.log(`[ML Extraction Queue] Cancelled ${cancelledCount} pending extractions for channel ${channelId}`);
        }

        return cancelledCount;
    }
}
