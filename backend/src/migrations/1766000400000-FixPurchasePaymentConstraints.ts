import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix Purchase Payment Table Constraints
 * 
 * This migration fixes constraint names and defaults to match TypeORM entity definitions.
 * Idempotent - safe to run multiple times.
 */
export class FixPurchasePaymentConstraints1766000400000 implements MigrationInterface {
  name = 'FixPurchasePaymentConstraints1766000400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fix paidAt default to use now() instead of CURRENT_TIMESTAMP
    await queryRunner.query(`
      DO $$
      BEGIN
        -- Only alter if default is different
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'purchase_payment' 
            AND column_name = 'paidAt' 
            AND column_default != 'now()'
        ) THEN
          ALTER TABLE "purchase_payment" 
          ALTER COLUMN "paidAt" SET DEFAULT now();
        END IF;
      END $$;
    `);

    // Drop old constraint if it exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_purchase_payment_purchase'
        ) THEN
          ALTER TABLE "purchase_payment" 
          DROP CONSTRAINT "FK_purchase_payment_purchase";
        END IF;
      END $$;
    `);

    // Add TypeORM-named purchase foreign key constraint
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_3d36aefdb19ddb291bc93ee81ca'
        ) THEN
          ALTER TABLE "purchase_payment"
          ADD CONSTRAINT "FK_3d36aefdb19ddb291bc93ee81ca"
          FOREIGN KEY ("purchaseId") REFERENCES "stock_purchase"("id") 
          ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    // Add supplier foreign key constraint
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_0c9b70b876976913b56e11e6a83'
        ) THEN
          ALTER TABLE "purchase_payment"
          ADD CONSTRAINT "FK_0c9b70b876976913b56e11e6a83"
          FOREIGN KEY ("supplierId") REFERENCES "customer"("id") 
          ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to old constraint name (for rollback)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_3d36aefdb19ddb291bc93ee81ca'
        ) THEN
          ALTER TABLE "purchase_payment" 
          DROP CONSTRAINT "FK_3d36aefdb19ddb291bc93ee81ca";
        END IF;
        
        IF EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_0c9b70b876976913b56e11e6a83'
        ) THEN
          ALTER TABLE "purchase_payment" 
          DROP CONSTRAINT "FK_0c9b70b876976913b56e11e6a83";
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_purchase_payment_purchase'
        ) THEN
          ALTER TABLE "purchase_payment"
          ADD CONSTRAINT "FK_purchase_payment_purchase"
          FOREIGN KEY ("purchaseId") REFERENCES "stock_purchase"("id") 
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }
}

