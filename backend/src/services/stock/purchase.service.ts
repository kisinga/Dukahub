import { Injectable, Logger } from '@nestjs/common';
import {
    Customer,
    ID,
    RequestContext,
    TransactionalConnection,
    UserInputError,
} from '@vendure/core';
import { StockPurchase } from './entities/purchase.entity';
import { StockPurchaseLine } from './entities/purchase.entity';
import { StockValidationService } from './stock-validation.service';

export interface PurchaseLineInput {
    variantId: ID;
    quantity: number;
    unitCost: number; // In smallest currency unit (cents)
    stockLocationId: ID;
}

export interface RecordPurchaseInput {
    supplierId: ID;
    purchaseDate: Date;
    referenceNumber?: string | null;
    paymentStatus: string;
    notes?: string | null;
    lines: PurchaseLineInput[];
}

/**
 * Purchase Service
 * 
 * Handles purchase-specific business logic.
 * Separated for single responsibility and testability.
 */
@Injectable()
export class PurchaseService {
    private readonly logger = new Logger('PurchaseService');

    constructor(
        private readonly connection: TransactionalConnection,
        private readonly validationService: StockValidationService,
    ) { }

    /**
     * Create purchase record
     */
    async createPurchaseRecord(
        ctx: RequestContext,
        input: RecordPurchaseInput
    ): Promise<StockPurchase> {
        // Validate supplier exists
        const customerRepo = this.connection.getRepository(ctx, Customer);
        const supplier = await customerRepo.findOne({
            where: { id: input.supplierId },
        });

        if (!supplier) {
            throw new UserInputError(`Supplier ${input.supplierId} not found`);
        }

        // Calculate total cost
        const totalCost = input.lines.reduce(
            (sum, line) => sum + line.quantity * line.unitCost,
            0
        );

        // Create purchase
        const purchaseRepo = this.connection.getRepository(ctx, StockPurchase);
        const purchaseLineRepo = this.connection.getRepository(ctx, StockPurchaseLine);
        
        // Create purchase entity
        const purchase = new StockPurchase();
        purchase.supplierId = String(input.supplierId);
        purchase.purchaseDate = input.purchaseDate;
        purchase.referenceNumber = input.referenceNumber || null;
        purchase.totalCost = totalCost;
        purchase.paymentStatus = input.paymentStatus;
        purchase.notes = input.notes || null;

        const savedPurchase = await purchaseRepo.save(purchase);

        // Create purchase lines
        const purchaseLines = input.lines.map(line => {
            const purchaseLine = new StockPurchaseLine();
            purchaseLine.purchaseId = savedPurchase.id;
            purchaseLine.variantId = String(line.variantId);
            purchaseLine.quantity = line.quantity;
            purchaseLine.unitCost = line.unitCost;
            purchaseLine.totalCost = line.quantity * line.unitCost;
            purchaseLine.stockLocationId = String(line.stockLocationId);
            return purchaseLine;
        });

        await purchaseLineRepo.save(purchaseLines);

        // Reload with relations
        const purchaseWithLines = await purchaseRepo.findOne({
            where: { id: savedPurchase.id },
            relations: ['lines', 'supplier'],
        });

        this.logger.log(`Created purchase record: ${savedPurchase.id}`);

        return purchaseWithLines || savedPurchase;
    }
}

