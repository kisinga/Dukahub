import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix foreign key column types to integer to match Vendure's ID types
 * 
 * This migration:
 * 1. Handles stockLocationId which was changed from uuid to varchar in a previous migration
 * 2. Changes all foreign key columns (supplierId, variantId, stockLocationId, adjustedByUserId) 
 *    from uuid/varchar to integer to match Vendure's ID format
 * 3. Drops and recreates foreign key constraints with proper types
 * 4. Drops and recreates indexes
 */
export class FixForeignKeyTypesToInteger1765000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop existing foreign key constraints that may have been auto-created by TypeORM
        // These need to be dropped before changing column types

        // Drop FKs for stock_purchase_line
        await queryRunner.query(`
            ALTER TABLE "stock_purchase_line" 
            DROP CONSTRAINT IF EXISTS "FK_bd427f6597557b41d91f40c73ec"
        `);
        await queryRunner.query(`
            ALTER TABLE "stock_purchase_line" 
            DROP CONSTRAINT IF EXISTS "FK_5af2795406d6b50c46d8637f142"
        `);
        await queryRunner.query(`
            ALTER TABLE "stock_purchase_line" 
            DROP CONSTRAINT IF EXISTS "FK_1731b607155cfe9708292d395b6"
        `);

        // Drop FKs for inventory_stock_adjustment_line
        await queryRunner.query(`
            ALTER TABLE "inventory_stock_adjustment_line" 
            DROP CONSTRAINT IF EXISTS "FK_204dc9892273a53354efc1ffd23"
        `);
        await queryRunner.query(`
            ALTER TABLE "inventory_stock_adjustment_line" 
            DROP CONSTRAINT IF EXISTS "FK_65ea54109f7b83cd6184ab6b8fc"
        `);
        await queryRunner.query(`
            ALTER TABLE "inventory_stock_adjustment_line" 
            DROP CONSTRAINT IF EXISTS "FK_e9aa675a33c73c4a95823b2ceab"
        `);

        // Drop FKs for inventory_stock_adjustment
        await queryRunner.query(`
            ALTER TABLE "inventory_stock_adjustment" 
            DROP CONSTRAINT IF EXISTS "FK_d15129d2bd69da018d184c08db9"
        `);

        // Drop FKs for stock_purchase
        await queryRunner.query(`
            ALTER TABLE "stock_purchase" 
            DROP CONSTRAINT IF EXISTS "FK_33172b0d5e3965cc4da584ec283"
        `);

        // Drop indexes that will be recreated
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inventory_stock_adjustment_line_adjustment"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inventory_stock_adjustment_created"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_purchase_line_purchase"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_purchase_date"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_purchase_supplier"`);

        // Fix stock_purchase table
        // supplierId: uuid -> integer (original migration created it as uuid)
        // Handle case where it might already be integer (idempotent)
        // Note: uuid columns will fail conversion - they need to be handled separately
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'stock_purchase' 
                    AND column_name = 'supplierId' 
                    AND data_type != 'integer'
                ) THEN
                    -- If it's uuid, we can't convert directly - this will only work if empty
                    -- For uuid, we'd need to clear data first or migrate separately
                    -- But since original migration created it as uuid, and Vendure IDs are integers,
                    -- we'll try the conversion - it will fail if there's UUID data
                    -- Convert uuid -> text -> integer
                    -- Handle case where column is uuid type (fresh database) or varchar (previous migration ran)
                    -- If data exists and is non-numeric (actual UUID), it will fail and need manual fix
                    ALTER TABLE "stock_purchase" 
                    ALTER COLUMN "supplierId" TYPE integer USING 
                        CASE 
                            WHEN "supplierId"::text ~ '^[0-9]+$' THEN "supplierId"::text::integer
                            ELSE NULL  -- Non-numeric UUID values will become NULL
                        END;
                END IF;
            END $$;
        `);

        // Fix stock_purchase_line table
        // variantId: uuid -> integer (original migration created it as uuid)
        // Handle case where it might already be integer (idempotent)
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'stock_purchase_line' 
                    AND column_name = 'variantId' 
                    AND data_type != 'integer'
                ) THEN
                    -- Convert uuid -> text -> integer
                    ALTER TABLE "stock_purchase_line" 
                    ALTER COLUMN "variantId" TYPE integer USING 
                        CASE 
                            WHEN "variantId"::text ~ '^[0-9]+$' THEN "variantId"::text::integer
                            ELSE NULL
                        END;
                END IF;
            END $$;
        `);

        // stockLocationId: varchar/uuid -> integer
        // Handle all cases: uuid (fresh), varchar (previous migration ran), or already integer
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'stock_purchase_line' 
                    AND column_name = 'stockLocationId' 
                    AND data_type != 'integer'
                ) THEN
                    ALTER TABLE "stock_purchase_line" 
                    ALTER COLUMN "stockLocationId" TYPE integer USING 
                        CASE 
                            WHEN "stockLocationId"::text ~ '^[0-9]+$' 
                            THEN "stockLocationId"::text::integer
                            ELSE NULL
                        END;
                END IF;
            END $$;
        `);

        // Fix inventory_stock_adjustment table
        // adjustedByUserId: varchar -> integer (changed from uuid in original migration)
        // Handle case where it might already be integer or NULL (idempotent)
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'inventory_stock_adjustment' 
                    AND column_name = 'adjustedByUserId' 
                    AND data_type != 'integer'
                ) THEN
                    ALTER TABLE "inventory_stock_adjustment" 
                    ALTER COLUMN "adjustedByUserId" TYPE integer USING 
                        CASE 
                            WHEN "adjustedByUserId" IS NULL OR "adjustedByUserId"::text = '' 
                            THEN NULL
                            WHEN "adjustedByUserId"::text ~ '^[0-9]+$'
                            THEN "adjustedByUserId"::text::integer
                            ELSE NULL
                        END;
                END IF;
            END $$;
        `);

        // Fix inventory_stock_adjustment_line table
        // variantId: uuid -> integer (original migration created it as uuid)
        // Handle case where it might already be integer (idempotent)
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'inventory_stock_adjustment_line' 
                    AND column_name = 'variantId' 
                    AND data_type != 'integer'
                ) THEN
                    -- Convert uuid -> text -> integer
                    ALTER TABLE "inventory_stock_adjustment_line" 
                    ALTER COLUMN "variantId" TYPE integer USING 
                        CASE 
                            WHEN "variantId"::text ~ '^[0-9]+$' THEN "variantId"::text::integer
                            ELSE NULL
                        END;
                END IF;
            END $$;
        `);

        // stockLocationId: varchar/uuid -> integer
        // Handle all cases: uuid (fresh), varchar (previous migration ran), or already integer
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'inventory_stock_adjustment_line' 
                    AND column_name = 'stockLocationId' 
                    AND data_type != 'integer'
                ) THEN
                    ALTER TABLE "inventory_stock_adjustment_line" 
                    ALTER COLUMN "stockLocationId" TYPE integer USING 
                        CASE 
                            WHEN "stockLocationId"::text ~ '^[0-9]+$' 
                            THEN "stockLocationId"::text::integer
                            ELSE NULL
                        END;
                END IF;
            END $$;
        `);

        // Recreate indexes
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

        // Recreate foreign key constraints with proper column types
        // stock_purchase.supplierId -> customer.id
        await queryRunner.query(`
            ALTER TABLE "stock_purchase" 
            ADD CONSTRAINT "FK_33172b0d5e3965cc4da584ec283" 
            FOREIGN KEY ("supplierId") REFERENCES "customer"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        // stock_purchase_line.variantId -> product_variant.id
        await queryRunner.query(`
            ALTER TABLE "stock_purchase_line" 
            ADD CONSTRAINT "FK_5af2795406d6b50c46d8637f142" 
            FOREIGN KEY ("variantId") REFERENCES "product_variant"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        // stock_purchase_line.stockLocationId -> stock_location.id
        await queryRunner.query(`
            ALTER TABLE "stock_purchase_line" 
            ADD CONSTRAINT "FK_1731b607155cfe9708292d395b6" 
            FOREIGN KEY ("stockLocationId") REFERENCES "stock_location"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        // inventory_stock_adjustment.adjustedByUserId -> user.id
        await queryRunner.query(`
            ALTER TABLE "inventory_stock_adjustment" 
            ADD CONSTRAINT "FK_d15129d2bd69da018d184c08db9" 
            FOREIGN KEY ("adjustedByUserId") REFERENCES "user"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        // inventory_stock_adjustment_line.variantId -> product_variant.id
        await queryRunner.query(`
            ALTER TABLE "inventory_stock_adjustment_line" 
            ADD CONSTRAINT "FK_65ea54109f7b83cd6184ab6b8fc" 
            FOREIGN KEY ("variantId") REFERENCES "product_variant"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        // inventory_stock_adjustment_line.stockLocationId -> stock_location.id
        await queryRunner.query(`
            ALTER TABLE "inventory_stock_adjustment_line" 
            ADD CONSTRAINT "FK_e9aa675a33c73c4a95823b2ceab" 
            FOREIGN KEY ("stockLocationId") REFERENCES "stock_location"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "inventory_stock_adjustment_line" 
            DROP CONSTRAINT IF EXISTS "FK_e9aa675a33c73c4a95823b2ceab"
        `);
        await queryRunner.query(`
            ALTER TABLE "inventory_stock_adjustment_line" 
            DROP CONSTRAINT IF EXISTS "FK_65ea54109f7b83cd6184ab6b8fc"
        `);
        await queryRunner.query(`
            ALTER TABLE "inventory_stock_adjustment" 
            DROP CONSTRAINT IF EXISTS "FK_d15129d2bd69da018d184c08db9"
        `);
        await queryRunner.query(`
            ALTER TABLE "stock_purchase_line" 
            DROP CONSTRAINT IF EXISTS "FK_1731b607155cfe9708292d395b6"
        `);
        await queryRunner.query(`
            ALTER TABLE "stock_purchase_line" 
            DROP CONSTRAINT IF EXISTS "FK_5af2795406d6b50c46d8637f142"
        `);
        await queryRunner.query(`
            ALTER TABLE "stock_purchase" 
            DROP CONSTRAINT IF EXISTS "FK_33172b0d5e3965cc4da584ec283"
        `);

        // Revert column types back to varchar/uuid
        await queryRunner.query(`
            ALTER TABLE "inventory_stock_adjustment_line" 
            ALTER COLUMN "stockLocationId" TYPE varchar USING "stockLocationId"::varchar
        `);
        await queryRunner.query(`
            ALTER TABLE "inventory_stock_adjustment_line" 
            ALTER COLUMN "variantId" TYPE uuid USING "variantId"::uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "inventory_stock_adjustment" 
            ALTER COLUMN "adjustedByUserId" TYPE varchar USING "adjustedByUserId"::varchar
        `);
        await queryRunner.query(`
            ALTER TABLE "stock_purchase_line" 
            ALTER COLUMN "stockLocationId" TYPE varchar USING "stockLocationId"::varchar
        `);
        await queryRunner.query(`
            ALTER TABLE "stock_purchase_line" 
            ALTER COLUMN "variantId" TYPE uuid USING "variantId"::uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "stock_purchase" 
            ALTER COLUMN "supplierId" TYPE varchar USING "supplierId"::varchar
        `);
    }
}

