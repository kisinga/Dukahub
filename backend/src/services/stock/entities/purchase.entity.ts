import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Customer, ProductVariant, StockLocation } from '@vendure/core';

@Entity('stock_purchase')
export class StockPurchase {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    supplierId: string;

    @ManyToOne(() => Customer)
    supplier: Customer;

    @Column({ type: 'timestamp' })
    purchaseDate: Date;

    @Column({ type: 'varchar', nullable: true })
    referenceNumber: string | null;

    @Column({ type: 'bigint' })
    totalCost: number; // In smallest currency unit (cents)

    @Column({ type: 'varchar' })
    paymentStatus: string; // 'paid', 'pending', 'partial'

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @OneToMany(() => StockPurchaseLine, line => line.purchase, { cascade: true })
    lines: StockPurchaseLine[];

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt: Date;
}

/**
 * Stock Purchase Line Entity
 * Represents a line item in a purchase order
 */
@Entity('stock_purchase_line')
export class StockPurchaseLine {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    purchaseId: string;

    @ManyToOne(() => StockPurchase, purchase => purchase.lines, { onDelete: 'CASCADE' })
    purchase: StockPurchase;

    @Column()
    variantId: string;

    @ManyToOne(() => ProductVariant)
    variant: ProductVariant;

    @Column({ type: 'float' })
    quantity: number;

    @Column({ type: 'bigint' })
    unitCost: number; // In smallest currency unit (cents)

    @Column({ type: 'bigint' })
    totalCost: number; // In smallest currency unit (cents)

    @Column()
    stockLocationId: string;

    @ManyToOne(() => StockLocation)
    stockLocation: StockLocation;
}

