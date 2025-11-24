import { Channel, ProductVariant, StockLocation } from '@vendure/core';
import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Inventory Batch Entity
 *
 * Tracks batches of stock with cost and expiry information.
 * Batches are immutable once created - new movements create new batches.
 *
 * Invariants:
 * - quantity >= 0
 * - Batches are channel-scoped
 * - sourceType + sourceId provide idempotency
 */
@Entity('inventory_batch')
@Index(['channelId', 'stockLocationId', 'productVariantId', 'createdAt'])
@Index(['channelId', 'sourceType', 'sourceId'])
@Index(['expiryDate'])
export class InventoryBatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'integer' })
  channelId!: number;

  @ManyToOne(() => Channel)
  channel!: Channel;

  @Column({ type: 'integer' })
  stockLocationId!: number;

  @ManyToOne(() => StockLocation)
  stockLocation!: StockLocation;

  @Column({ type: 'integer' })
  productVariantId!: number;

  @ManyToOne(() => ProductVariant)
  productVariant!: ProductVariant;

  @Column({ type: 'float' })
  quantity!: number;

  @Column({ type: 'bigint' })
  unitCost!: number; // in cents

  @Column({ type: 'timestamp', nullable: true })
  expiryDate!: Date | null;

  @Column({ type: 'varchar', length: 64 })
  sourceType!: string; // e.g., 'Purchase', 'Adjustment', 'Transfer'

  @Column({ type: 'varchar', length: 255 })
  sourceId!: string; // e.g., purchase ID, adjustment ID

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
