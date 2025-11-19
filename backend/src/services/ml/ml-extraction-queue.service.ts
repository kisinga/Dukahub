import { Injectable, Logger, Optional } from '@nestjs/common';
import { RequestContext, TransactionalConnection } from '@vendure/core';
import { ChannelEventRouterService } from '../../infrastructure/events/channel-event-router.service';
import { ActionCategory } from '../../infrastructure/events/types/action-category.enum';
import { ChannelEventType } from '../../infrastructure/events/types/event-type.enum';
import { TracingService } from '../../infrastructure/observability/tracing.service';
import { MetricsService } from '../../infrastructure/observability/metrics.service';

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
  private readonly logger = new Logger(MlExtractionQueueService.name);

  constructor(
    private connection: TransactionalConnection,
    @Optional() private eventRouter?: ChannelEventRouterService, // Optional to avoid circular dependency
    @Optional() private tracingService?: TracingService,
    @Optional() private metricsService?: MetricsService
  ) {}

  /**
   * Schedule a new extraction for a channel
   */
  async scheduleExtraction(
    ctx: RequestContext,
    channelId: string,
    delayMinutes: number = 5
  ): Promise<string> {
    const span = this.tracingService?.startSpan('ml.scheduleExtraction', {
      'ml.channel_id': channelId,
      'ml.delay_minutes': delayMinutes.toString(),
    });

    try {
      const scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000);

      const result = await this.connection.rawConnection.query(
        `
                INSERT INTO ml_extraction_queue (channel_id, scheduled_at, status, created_at, updated_at)
                VALUES ($1, $2, 'pending', NOW(), NOW())
                RETURNING id
            `,
        [channelId, scheduledAt]
      );

      const extractionId = result.rows[0].id;

      this.tracingService?.setAttributes(span!, {
        'ml.extraction_id': extractionId,
        'ml.scheduled_at': scheduledAt.toISOString(),
      });
      this.tracingService?.addEvent(span!, 'ml.extraction.scheduled', {
        'ml.extraction_id': extractionId,
      });

      this.logger.log(
        `Scheduled extraction ${extractionId} for channel ${channelId} at ${scheduledAt.toISOString()}`
      );

      // Emit extraction queued event
      if (this.eventRouter) {
        await this.eventRouter
          .routeEvent({
            type: ChannelEventType.ML_EXTRACTION_QUEUED,
            channelId,
            category: ActionCategory.SYSTEM_NOTIFICATIONS,
            context: ctx,
            data: {
              extractionId,
              channelId,
              scheduledAt: scheduledAt.toISOString(),
            },
          })
          .catch(err => {
            this.logger.warn(
              `Failed to route ML extraction queued event: ${err instanceof Error ? err.message : String(err)}`
            );
          });
      }

      this.tracingService?.endSpan(span!, true);
      return extractionId;
    } catch (error) {
      this.tracingService?.endSpan(
        span!,
        false,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Check if a channel has a recent pending extraction (within 30 seconds)
   */
  async hasRecentPendingExtraction(ctx: RequestContext, channelId: string): Promise<boolean> {
    try {
      const result = await this.connection.rawConnection.query(
        `
                SELECT id FROM ml_extraction_queue 
                WHERE channel_id = $1 
                AND status = 'pending' 
                AND created_at > NOW() - INTERVAL '30 seconds'
                LIMIT 1
            `,
        [channelId]
      );

      return result.rows.length > 0;
    } catch (error) {
      // Handle table not existing
      if (
        error instanceof Error &&
        error.message.includes('relation "ml_extraction_queue" does not exist')
      ) {
        this.logger.log('Table does not exist yet, returning false for recent check');
        return false;
      }
      this.logger.error('Error checking recent pending extraction:', error);
      return false;
    }
  }

  /**
   * Get all pending extractions that are due for processing
   */
  async getDueExtractions(ctx: RequestContext): Promise<ScheduledExtraction[]> {
    try {
      const result = await this.connection.rawConnection.query(`
                SELECT id, channel_id, scheduled_at, status, created_at, updated_at, error
                FROM ml_extraction_queue 
                WHERE status = 'pending' 
                AND scheduled_at <= NOW()
                ORDER BY scheduled_at ASC
            `);

      // Handle case where table doesn't exist yet or query fails
      if (!result || !result.rows) {
        this.logger.log('Table not found or no results, returning empty array');
        return [];
      }

      // Log the number of due extractions found
      if (result.rows.length === 0) {
        this.logger.log(
          'No due extractions found (this is normal when no products have been updated recently)'
        );
      } else {
        this.logger.log(`Found ${result.rows.length} due extractions to process`);
      }

      return result.rows.map((row: any) => ({
        id: row.id,
        channelId: row.channel_id,
        scheduledAt: new Date(row.scheduled_at),
        status: row.status,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        error: row.error,
      }));
    } catch (error) {
      // Handle table not existing or other database errors
      if (
        error instanceof Error &&
        error.message.includes('relation "ml_extraction_queue" does not exist')
      ) {
        this.logger.log('Table does not exist yet, returning empty array');
        return [];
      }
      this.logger.error('Error getting due extractions:', error);
      return [];
    }
  }

  /**
   * Mark an extraction as processing
   */
  async markAsProcessing(ctx: RequestContext, extractionId: string): Promise<void> {
    // Get channel ID from extraction record
    const extractionResult = await this.connection.rawConnection.query(
      `
            SELECT channel_id FROM ml_extraction_queue WHERE id = $1
        `,
      [extractionId]
    );

    if (extractionResult.rows.length === 0) {
      this.logger.warn(`Extraction ${extractionId} not found when marking as processing`);
      return;
    }

    const channelId = extractionResult.rows[0].channel_id;

    await this.connection.rawConnection.query(
      `
            UPDATE ml_extraction_queue 
            SET status = 'processing', updated_at = NOW()
            WHERE id = $1
        `,
      [extractionId]
    );

    this.logger.log(`Marked extraction ${extractionId} as processing`);

    // Emit extraction started event
    if (this.eventRouter) {
      await this.eventRouter
        .routeEvent({
          type: ChannelEventType.ML_EXTRACTION_STARTED,
          channelId,
          category: ActionCategory.SYSTEM_NOTIFICATIONS,
          context: ctx,
          data: {
            extractionId,
            channelId,
          },
        })
        .catch(err => {
          this.logger.warn(
            `Failed to route ML extraction started event: ${err instanceof Error ? err.message : String(err)}`
          );
        });
    }
  }

  /**
   * Mark an extraction as completed
   */
  async markAsCompleted(ctx: RequestContext, extractionId: string): Promise<void> {
    // Get channel ID from extraction record
    const extractionResult = await this.connection.rawConnection.query(
      `
            SELECT channel_id FROM ml_extraction_queue WHERE id = $1
        `,
      [extractionId]
    );

    if (extractionResult.rows.length === 0) {
      this.logger.warn(`Extraction ${extractionId} not found when marking as completed`);
      return;
    }

    const channelId = extractionResult.rows[0].channel_id;

    await this.connection.rawConnection.query(
      `
            UPDATE ml_extraction_queue 
            SET status = 'completed', updated_at = NOW()
            WHERE id = $1
        `,
      [extractionId]
    );

    this.logger.log(`Marked extraction ${extractionId} as completed`);

    // Emit extraction completed event
    if (this.eventRouter) {
      await this.eventRouter
        .routeEvent({
          type: ChannelEventType.ML_EXTRACTION_COMPLETED,
          channelId,
          category: ActionCategory.SYSTEM_NOTIFICATIONS,
          context: ctx,
          data: {
            extractionId,
            channelId,
          },
        })
        .catch(err => {
          this.logger.warn(
            `Failed to route ML extraction completed event: ${err instanceof Error ? err.message : String(err)}`
          );
        });
    }
  }

  /**
   * Mark an extraction as failed
   */
  async markAsFailed(ctx: RequestContext, extractionId: string, error: string): Promise<void> {
    // Get channel ID from extraction record
    const extractionResult = await this.connection.rawConnection.query(
      `
            SELECT channel_id FROM ml_extraction_queue WHERE id = $1
        `,
      [extractionId]
    );

    if (extractionResult.rows.length === 0) {
      this.logger.warn(`Extraction ${extractionId} not found when marking as failed`);
      return;
    }

    const channelId = extractionResult.rows[0].channel_id;

    await this.connection.rawConnection.query(
      `
            UPDATE ml_extraction_queue 
            SET status = 'failed', error = $2, updated_at = NOW()
            WHERE id = $1
        `,
      [extractionId, error]
    );

    this.logger.log(`Marked extraction ${extractionId} as failed: ${error}`);

    // Emit extraction failed event
    if (this.eventRouter) {
      await this.eventRouter
        .routeEvent({
          type: ChannelEventType.ML_EXTRACTION_FAILED,
          channelId,
          category: ActionCategory.SYSTEM_NOTIFICATIONS,
          context: ctx,
          data: {
            extractionId,
            channelId,
            error,
          },
        })
        .catch(err => {
          this.logger.warn(
            `Failed to route ML extraction failed event: ${err instanceof Error ? err.message : String(err)}`
          );
        });
    }
  }

  /**
   * Clean up old completed extractions (older than 7 days)
   */
  async cleanupOldExtractions(ctx: RequestContext): Promise<number> {
    try {
      const result = await this.connection.rawConnection.query(`
                DELETE FROM ml_extraction_queue 
                WHERE status IN ('completed', 'failed') 
                AND updated_at < NOW() - INTERVAL '7 days'
            `);

      const deletedCount = result.rowCount || 0;
      if (deletedCount > 0) {
        this.logger.log(`Cleaned up ${deletedCount} old extractions`);
      }

      return deletedCount;
    } catch (error) {
      // Handle table not existing or other database errors
      if (
        error instanceof Error &&
        error.message.includes('relation "ml_extraction_queue" does not exist')
      ) {
        this.logger.log('Table does not exist yet, skipping cleanup');
        return 0;
      }
      this.logger.error('Error cleaning up old extractions:', error);
      return 0;
    }
  }

  /**
   * Get extraction history for a channel
   */
  async getChannelHistory(
    ctx: RequestContext,
    channelId: string,
    limit: number = 10
  ): Promise<ScheduledExtraction[]> {
    const result = await this.connection.rawConnection.query(
      `
            SELECT id, channel_id, scheduled_at, status, created_at, updated_at, error
            FROM ml_extraction_queue 
            WHERE channel_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        `,
      [channelId, limit]
    );

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
    const result = await this.connection.rawConnection.query(
      `
            UPDATE ml_extraction_queue 
            SET status = 'failed', error = 'Cancelled by user', updated_at = NOW()
            WHERE channel_id = $1 AND status = 'pending'
        `,
      [channelId]
    );

    const cancelledCount = result.rowCount || 0;
    if (cancelledCount > 0) {
      this.logger.log(`Cancelled ${cancelledCount} pending extractions for channel ${channelId}`);
    }

    return cancelledCount;
  }
}
