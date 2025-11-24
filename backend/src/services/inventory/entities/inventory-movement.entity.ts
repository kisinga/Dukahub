import { Channel, ProductVariant, StockLocation } from '@vendure/core';
import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { InventoryBatch } from './inventory-batch.entity';

/**
 * Movement types for inventory operations
 */
export enum MovementType {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER = 'TRANSFER',
  WRITE_OFF = 'WRITE_OFF',
  EXPIRY = 'EXPIRY',
}

/**
 * Inventory Movement Entity
 *
 * Immutable audit trail of all stock changes.
 * Movements are never modified once created.
 *
 * Invariants:
 * - Immutable once created
 * - sum of movements = current stock
 * - sourceType + sourceId provide idempotency
 */
@Entity('inventory_movement')
@Index(['channelId', 'stockLocationId', 'productVariantId', 'createdAt'])
@Index(['channelId', 'sourceType', 'sourceId'], { unique: true })
@Index(['batchId'])
@Index(['movementType'])
export class InventoryMovement {
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

  @Column({ type: 'varchar', length: 32 })
  movementType!: MovementType;

  @Column({ type: 'float' })
  quantity!: number; // positive for increases, negative for decreases

  @Column({ type: 'uuid', nullable: true })
  batchId!: string | null;

  @ManyToOne(() => InventoryBatch, { nullable: true })
  batch!: InventoryBatch | null;

  @Column({ type: 'varchar', length: 64 })
  sourceType!: string; // e.g., 'Purchase', 'Order', 'Adjustment'

  @Column({ type: 'varchar', length: 255 })
  sourceId!: string; // e.g., purchase ID, order ID, adjustment ID

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
