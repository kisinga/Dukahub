import { Injectable, Logger, Optional } from '@nestjs/common';
import { ID, RequestContext, TransactionalConnection, UserInputError } from '@vendure/core';
import { LedgerPostingService } from '../financial/ledger-posting.service';
import {
  BatchAllocation,
  CostAllocationRequest,
  CostingStrategy,
} from './interfaces/costing-strategy.interface';
import { ExpiryPolicy } from './interfaces/expiry-policy.interface';
import {
  BatchFilters,
  CreateBatchInput,
  CreateMovementInput,
  InventoryBatch,
  InventoryMovement,
  InventoryStore,
  MovementType,
  ValuationSnapshot,
} from './interfaces/inventory-store.interface';

/**
 * Input for recording a purchase
 */
export interface RecordPurchaseInput {
  purchaseId: string;
  channelId: ID;
  stockLocationId: ID;
  supplierId: string;
  purchaseReference: string;
  isCreditPurchase: boolean;
  lines: Array<{
    productVariantId: ID;
    quantity: number;
    unitCost: number; // in cents
    expiryDate?: Date | null;
  }>;
}

/**
 * Result of recording a purchase
 */
export interface PurchaseResult {
  purchaseId: string;
  batches: InventoryBatch[];
  movements: InventoryMovement[];
}

/**
 * Input for recording a sale
 */
export interface RecordSaleInput {
  orderId: string;
  orderCode: string;
  channelId: ID;
  stockLocationId: ID;
  customerId: string;
  lines: Array<{
    productVariantId: ID;
    quantity: number;
  }>;
}

/**
 * Result of recording a sale
 */
export interface SaleResult {
  orderId: string;
  allocations: BatchAllocation[];
  totalCogs: number; // in cents
  movements: InventoryMovement[];
}

/**
 * Input for recording an adjustment
 */
export interface RecordAdjustmentInput {
  adjustmentId: string;
  channelId: ID;
  stockLocationId: ID;
  reason: string;
  lines: Array<{
    productVariantId: ID;
    quantityChange: number; // positive for increase, negative for decrease
  }>;
}

/**
 * Result of recording an adjustment
 */
export interface AdjustmentResult {
  adjustmentId: string;
  movements: InventoryMovement[];
}

/**
 * Input for recording a write-off
 */
export interface RecordWriteOffInput {
  adjustmentId: string;
  channelId: ID;
  stockLocationId: ID;
  reason: string;
  lines: Array<{
    productVariantId: ID;
    quantity: number;
  }>;
}

/**
 * Result of recording a write-off
 */
export interface WriteOffResult {
  adjustmentId: string;
  allocations: BatchAllocation[];
  totalLoss: number; // in cents
  movements: InventoryMovement[];
}

/**
 * InventoryService
 *
 * High-level facade for inventory operations.
 * Orchestrates InventoryStore, CostingStrategy, ExpiryPolicy, and LedgerPostingService
 * with transaction boundaries and verification.
 */
@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly connection: TransactionalConnection,
    private readonly inventoryStore: InventoryStore,
    private readonly costingStrategy: CostingStrategy,
    private readonly expiryPolicy: ExpiryPolicy,
    private readonly ledgerPostingService: LedgerPostingService
  ) {}

  /**
   * Record a purchase and create inventory batches
   */
  async recordPurchase(ctx: RequestContext, input: RecordPurchaseInput): Promise<PurchaseResult> {
    return this.connection.withTransaction(ctx, async transactionCtx => {
      try {
        const batches: InventoryBatch[] = [];
        const movements: InventoryMovement[] = [];

        // Create batches and movements for each line
        for (const line of input.lines) {
          // Create batch
          const batchInput: CreateBatchInput = {
            channelId: input.channelId,
            stockLocationId: input.stockLocationId,
            productVariantId: line.productVariantId,
            quantity: line.quantity,
            unitCost: line.unitCost,
            expiryDate: line.expiryDate || null,
            sourceType: 'Purchase',
            sourceId: input.purchaseId,
            metadata: {
              purchaseReference: input.purchaseReference,
              supplierId: input.supplierId,
            },
          };

          const batch = await this.inventoryStore.createBatch(transactionCtx, batchInput);
          batches.push(batch);

          // Verify batch was created
          const batchExists = await this.inventoryStore.verifyBatchExists(transactionCtx, batch.id);
          if (!batchExists) {
            throw new Error(`Failed to create batch for purchase ${input.purchaseId}`);
          }

          // Create movement
          const movementInput: CreateMovementInput = {
            channelId: input.channelId,
            stockLocationId: input.stockLocationId,
            productVariantId: line.productVariantId,
            movementType: MovementType.PURCHASE,
            quantity: line.quantity,
            batchId: batch.id,
            sourceType: 'Purchase',
            sourceId: input.purchaseId,
            metadata: {
              purchaseReference: input.purchaseReference,
              supplierId: input.supplierId,
            },
          };

          const movement = await this.inventoryStore.createMovement(transactionCtx, movementInput);
          movements.push(movement);

          // Call expiry policy hook
          await this.expiryPolicy.onBatchCreated(transactionCtx, batch);
        }

        // Post to ledger
        const totalCost = input.lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0);

        await this.ledgerPostingService.postInventoryPurchase(transactionCtx, input.purchaseId, {
          purchaseId: input.purchaseId,
          purchaseReference: input.purchaseReference,
          supplierId: input.supplierId,
          totalCost,
          isCreditPurchase: input.isCreditPurchase,
          batchAllocations: batches.map(b => ({
            batchId: String(b.id),
            quantity: b.quantity,
            unitCost: b.unitCost,
          })),
        });

        this.logger.log(
          `Recorded purchase ${input.purchaseId}: ${batches.length} batches, total cost: ${totalCost}`
        );

        return {
          purchaseId: input.purchaseId,
          batches,
          movements,
        };
      } catch (error) {
        this.logger.error(
          `Failed to record purchase ${input.purchaseId}: ${error instanceof Error ? error.message : String(error)}`
        );
        throw error;
      }
    });
  }

  /**
   * Record a sale and allocate COGS
   */
  async recordSale(ctx: RequestContext, input: RecordSaleInput): Promise<SaleResult> {
    return this.connection.withTransaction(ctx, async transactionCtx => {
      try {
        const allAllocations: BatchAllocation[] = [];
        const movements: InventoryMovement[] = [];

        // Process each line
        for (const line of input.lines) {
          // Verify stock level
          const hasStock = await this.inventoryStore.verifyStockLevel(
            transactionCtx,
            line.productVariantId,
            input.stockLocationId,
            line.quantity
          );

          if (!hasStock) {
            throw new UserInputError(
              `Insufficient stock for variant ${line.productVariantId}. Requested: ${line.quantity}`
            );
          }

          // Allocate cost using costing strategy
          const allocationRequest: CostAllocationRequest = {
            channelId: input.channelId,
            stockLocationId: input.stockLocationId,
            productVariantId: line.productVariantId,
            quantity: line.quantity,
            sourceType: 'Order',
            sourceId: input.orderId,
            metadata: {
              orderCode: input.orderCode,
              customerId: input.customerId,
            },
          };

          const allocationResult = await this.costingStrategy.allocateCost(
            transactionCtx,
            allocationRequest
          );

          // Validate expiry for each batch before consuming
          for (const allocation of allocationResult.allocations) {
            const batch = await this.inventoryStore.getOpenBatches(transactionCtx, {
              channelId: input.channelId,
              stockLocationId: input.stockLocationId,
              productVariantId: line.productVariantId,
            });

            const allocatedBatch = batch.find(b => b.id === allocation.batchId);
            if (!allocatedBatch) {
              throw new Error(`Batch ${allocation.batchId} not found`);
            }

            const expiryValidation = await this.expiryPolicy.validateBeforeConsume(
              transactionCtx,
              allocatedBatch,
              allocation.quantity,
              MovementType.SALE
            );

            if (!expiryValidation.allowed) {
              throw new UserInputError(
                expiryValidation.error || 'Cannot consume batch due to expiry policy'
              );
            }

            if (expiryValidation.warning) {
              this.logger.warn(expiryValidation.warning);
            }

            // Update batch quantity
            await this.inventoryStore.updateBatchQuantity(
              transactionCtx,
              allocation.batchId,
              -allocation.quantity
            );

            // Create movement
            const movementInput: CreateMovementInput = {
              channelId: input.channelId,
              stockLocationId: input.stockLocationId,
              productVariantId: line.productVariantId,
              movementType: MovementType.SALE,
              quantity: -allocation.quantity,
              batchId: allocation.batchId,
              sourceType: 'Order',
              sourceId: input.orderId,
              metadata: {
                orderCode: input.orderCode,
                customerId: input.customerId,
              },
            };

            const movement = await this.inventoryStore.createMovement(
              transactionCtx,
              movementInput
            );
            movements.push(movement);
          }

          allAllocations.push(...allocationResult.allocations);
        }

        // Calculate total COGS
        const totalCogs = allAllocations.reduce((sum, alloc) => sum + alloc.totalCost, 0);

        // Post COGS to ledger
        await this.ledgerPostingService.postInventorySaleCogs(transactionCtx, input.orderId, {
          orderId: input.orderId,
          orderCode: input.orderCode,
          customerId: input.customerId,
          cogsAllocations: allAllocations.map(a => ({
            batchId: String(a.batchId),
            quantity: a.quantity,
            unitCost: a.unitCost,
            totalCost: a.totalCost,
          })),
          totalCogs,
        });

        this.logger.log(
          `Recorded sale ${input.orderId}: ${allAllocations.length} allocations, total COGS: ${totalCogs}`
        );

        return {
          orderId: input.orderId,
          allocations: allAllocations,
          totalCogs,
          movements,
        };
      } catch (error) {
        this.logger.error(
          `Failed to record sale ${input.orderId}: ${error instanceof Error ? error.message : String(error)}`
        );
        throw error;
      }
    });
  }

  /**
   * Record a stock adjustment
   */
  async recordAdjustment(
    ctx: RequestContext,
    input: RecordAdjustmentInput
  ): Promise<AdjustmentResult> {
    return this.connection.withTransaction(ctx, async transactionCtx => {
      try {
        const movements: InventoryMovement[] = [];

        for (const line of input.lines) {
          // Create movement
          const movementInput: CreateMovementInput = {
            channelId: input.channelId,
            stockLocationId: input.stockLocationId,
            productVariantId: line.productVariantId,
            movementType: MovementType.ADJUSTMENT,
            quantity: line.quantityChange,
            batchId: null, // Adjustments don't reference specific batches
            sourceType: 'Adjustment',
            sourceId: input.adjustmentId,
            metadata: {
              reason: input.reason,
            },
          };

          const movement = await this.inventoryStore.createMovement(transactionCtx, movementInput);
          movements.push(movement);
        }

        this.logger.log(`Recorded adjustment ${input.adjustmentId}: ${movements.length} movements`);

        return {
          adjustmentId: input.adjustmentId,
          movements,
        };
      } catch (error) {
        this.logger.error(
          `Failed to record adjustment ${input.adjustmentId}: ${error instanceof Error ? error.message : String(error)}`
        );
        throw error;
      }
    });
  }

  /**
   * Record a write-off with COGS allocation
   */
  async recordWriteOff(ctx: RequestContext, input: RecordWriteOffInput): Promise<WriteOffResult> {
    return this.connection.withTransaction(ctx, async transactionCtx => {
      try {
        const allAllocations: BatchAllocation[] = [];
        const movements: InventoryMovement[] = [];

        for (const line of input.lines) {
          // Allocate cost for write-off
          const allocationRequest: CostAllocationRequest = {
            channelId: input.channelId,
            stockLocationId: input.stockLocationId,
            productVariantId: line.productVariantId,
            quantity: line.quantity,
            sourceType: 'WriteOff',
            sourceId: input.adjustmentId,
            metadata: {
              reason: input.reason,
            },
          };

          const allocationResult = await this.costingStrategy.allocateCost(
            transactionCtx,
            allocationRequest
          );

          // Update batch quantities and create movements
          for (const allocation of allocationResult.allocations) {
            // Update batch quantity
            await this.inventoryStore.updateBatchQuantity(
              transactionCtx,
              allocation.batchId,
              -allocation.quantity
            );

            // Create movement
            const movementInput: CreateMovementInput = {
              channelId: input.channelId,
              stockLocationId: input.stockLocationId,
              productVariantId: line.productVariantId,
              movementType: MovementType.WRITE_OFF,
              quantity: -allocation.quantity,
              batchId: allocation.batchId,
              sourceType: 'WriteOff',
              sourceId: input.adjustmentId,
              metadata: {
                reason: input.reason,
              },
            };

            const movement = await this.inventoryStore.createMovement(
              transactionCtx,
              movementInput
            );
            movements.push(movement);
          }

          allAllocations.push(...allocationResult.allocations);
        }

        // Calculate total loss
        const totalLoss = allAllocations.reduce((sum, alloc) => sum + alloc.totalCost, 0);

        // Post write-off to ledger
        await this.ledgerPostingService.postInventoryWriteOff(transactionCtx, input.adjustmentId, {
          adjustmentId: input.adjustmentId,
          reason: input.reason,
          batchAllocations: allAllocations.map(a => ({
            batchId: String(a.batchId),
            quantity: a.quantity,
            unitCost: a.unitCost,
            totalCost: a.totalCost,
          })),
          totalLoss,
        });

        this.logger.log(
          `Recorded write-off ${input.adjustmentId}: ${allAllocations.length} allocations, total loss: ${totalLoss}`
        );

        return {
          adjustmentId: input.adjustmentId,
          allocations: allAllocations,
          totalLoss,
          movements,
        };
      } catch (error) {
        this.logger.error(
          `Failed to record write-off ${input.adjustmentId}: ${error instanceof Error ? error.message : String(error)}`
        );
        throw error;
      }
    });
  }

  /**
   * Get valuation snapshot
   */
  async getValuation(ctx: RequestContext, filters: BatchFilters): Promise<ValuationSnapshot> {
    return this.inventoryStore.getValuationSnapshot(ctx, filters);
  }

  /**
   * Get open batches
   */
  async getOpenBatches(ctx: RequestContext, filters: BatchFilters): Promise<InventoryBatch[]> {
    return this.inventoryStore.getOpenBatches(ctx, filters);
  }
}
