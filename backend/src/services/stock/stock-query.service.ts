import { Injectable, Logger } from '@nestjs/common';
import {
    ID,
    RequestContext,
    TransactionalConnection,
} from '@vendure/core';
import { StockPurchase } from './entities/purchase.entity';
import { InventoryStockAdjustment } from './entities/stock-adjustment.entity';

export interface PurchaseListOptions {
    skip?: number;
    take?: number;
    filter?: {
        supplierId?: ID;
        startDate?: Date;
        endDate?: Date;
    };
}

export interface StockAdjustmentListOptions {
    skip?: number;
    take?: number;
    filter?: {
        reason?: string;
        startDate?: Date;
        endDate?: Date;
    };
}

/**
 * Stock Query Service
 * 
 * Handles querying purchases and stock adjustments.
 */
@Injectable()
export class StockQueryService {
    private readonly logger = new Logger('StockQueryService');

    constructor(
        private readonly connection: TransactionalConnection,
    ) { }

    /**
     * Get purchases with filtering and pagination
     */
    async getPurchases(
        ctx: RequestContext,
        options: PurchaseListOptions = {}
    ): Promise<{ items: StockPurchase[]; totalItems: number }> {
        const purchaseRepo = this.connection.getRepository(ctx, StockPurchase);
        const queryBuilder = purchaseRepo
            .createQueryBuilder('purchase')
            .leftJoinAndSelect('purchase.supplier', 'supplier')
            .leftJoinAndSelect('purchase.lines', 'lines')
            .leftJoinAndSelect('lines.variant', 'variant')
            .leftJoinAndSelect('lines.stockLocation', 'stockLocation');

        // Apply filters
        if (options.filter?.supplierId) {
            queryBuilder.andWhere('purchase.supplierId = :supplierId', {
                supplierId: options.filter.supplierId,
            });
        }

        if (options.filter?.startDate) {
            queryBuilder.andWhere('purchase.purchaseDate >= :startDate', {
                startDate: options.filter.startDate,
            });
        }

        if (options.filter?.endDate) {
            queryBuilder.andWhere('purchase.purchaseDate <= :endDate', {
                endDate: options.filter.endDate,
            });
        }

        // Get total count
        const totalItems = await queryBuilder.getCount();

        // Apply pagination
        if (options.skip !== undefined) {
            queryBuilder.skip(options.skip);
        }

        if (options.take !== undefined) {
            queryBuilder.take(options.take);
        }

        // Order by date descending
        queryBuilder.orderBy('purchase.purchaseDate', 'DESC');

        const items = await queryBuilder.getMany();

        return { items, totalItems };
    }

    /**
     * Get stock adjustments with filtering and pagination
     */
    async getStockAdjustments(
        ctx: RequestContext,
        options: StockAdjustmentListOptions = {}
    ): Promise<{ items: InventoryStockAdjustment[]; totalItems: number }> {
        const adjustmentRepo = this.connection.getRepository(ctx, InventoryStockAdjustment);
        const queryBuilder = adjustmentRepo
            .createQueryBuilder('adjustment')
            .leftJoinAndSelect('adjustment.adjustedBy', 'adjustedBy')
            .leftJoinAndSelect('adjustment.lines', 'lines')
            .leftJoinAndSelect('lines.variant', 'variant')
            .leftJoinAndSelect('lines.stockLocation', 'stockLocation');

        // Apply filters
        if (options.filter?.reason) {
            queryBuilder.andWhere('adjustment.reason = :reason', {
                reason: options.filter.reason,
            });
        }

        if (options.filter?.startDate) {
            queryBuilder.andWhere('adjustment.createdAt >= :startDate', {
                startDate: options.filter.startDate,
            });
        }

        if (options.filter?.endDate) {
            queryBuilder.andWhere('adjustment.createdAt <= :endDate', {
                endDate: options.filter.endDate,
            });
        }

        // Get total count
        const totalItems = await queryBuilder.getCount();

        // Apply pagination
        if (options.skip !== undefined) {
            queryBuilder.skip(options.skip);
        }

        if (options.take !== undefined) {
            queryBuilder.take(options.take);
        }

        // Order by date descending
        queryBuilder.orderBy('adjustment.createdAt', 'DESC');

        const items = await queryBuilder.getMany();

        return { items, totalItems };
    }
}

