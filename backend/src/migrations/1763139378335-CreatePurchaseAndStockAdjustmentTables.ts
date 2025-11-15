import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePurchaseAndStockAdjustmentTables1763139378335 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create purchase table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "stock_purchase" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "supplierId" uuid NOT NULL,
                "purchaseDate" timestamp NOT NULL,
                "referenceNumber" character varying,
                "totalCost" bigint NOT NULL,
                "paymentStatus" character varying NOT NULL,
                "notes" text,
                "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "PK_stock_purchase" PRIMARY KEY ("id")
            )
        `);

        // Create purchase_line table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "stock_purchase_line" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "purchaseId" uuid NOT NULL,
                "variantId" uuid NOT NULL,
                "quantity" float NOT NULL,
                "unitCost" bigint NOT NULL,
                "totalCost" bigint NOT NULL,
                "stockLocationId" uuid NOT NULL,
                CONSTRAINT "PK_stock_purchase_line" PRIMARY KEY ("id"),
                CONSTRAINT "FK_stock_purchase_line_purchase" FOREIGN KEY ("purchaseId") 
                    REFERENCES "stock_purchase"("id") ON DELETE CASCADE
            )
        `);

        // Create inventory_stock_adjustment table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "inventory_stock_adjustment" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "reason" character varying NOT NULL,
                "notes" text,
                "adjustedByUserId" varchar,
                "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "PK_inventory_stock_adjustment" PRIMARY KEY ("id")
            )
        `);

        // Create inventory_stock_adjustment_line table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "inventory_stock_adjustment_line" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "adjustmentId" uuid NOT NULL,
                "variantId" uuid NOT NULL,
                "quantityChange" float NOT NULL,
                "previousStock" float NOT NULL,
                "newStock" float NOT NULL,
                "stockLocationId" uuid NOT NULL,
                CONSTRAINT "PK_inventory_stock_adjustment_line" PRIMARY KEY ("id"),
                CONSTRAINT "FK_inventory_stock_adjustment_line_adjustment" FOREIGN KEY ("adjustmentId") 
                    REFERENCES "inventory_stock_adjustment"("id") ON DELETE CASCADE
            )
        `);

        // Create indexes
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_stock_purchase_supplier" ON "stock_purchase" ("supplierId")
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_stock_purchase_date" ON "stock_purchase" ("purchaseDate")
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_stock_purchase_line_purchase" ON "stock_purchase_line" ("purchaseId")
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_inventory_stock_adjustment_created" ON "inventory_stock_adjustment" ("createdAt")
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_inventory_stock_adjustment_line_adjustment" ON "inventory_stock_adjustment_line" ("adjustmentId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inventory_stock_adjustment_line_adjustment"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inventory_stock_adjustment_created"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_purchase_line_purchase"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_purchase_date"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_purchase_supplier"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE IF EXISTS "inventory_stock_adjustment_line"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "inventory_stock_adjustment"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "stock_purchase_line"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "stock_purchase"`);
    }
}

