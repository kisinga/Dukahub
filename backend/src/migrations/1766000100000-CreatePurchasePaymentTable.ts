import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePurchasePaymentTable1766000100000 implements MigrationInterface {
    name = 'CreatePurchasePaymentTable1766000100000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create table if not exists
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "purchase_payment" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "purchaseId" uuid NOT NULL,
        "amount" bigint NOT NULL,
        "method" varchar(64) NOT NULL,
        "reference" varchar(128) NULL,
        "paidAt" timestamp NOT NULL DEFAULT now(),
        "meta" jsonb NULL,
        "supplierId" integer NOT NULL
      )
    `);

        // Create indexes if not exists
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_purchase_payment_purchase" 
      ON "purchase_payment" ("purchaseId")
    `);

        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_purchase_payment_supplier" 
      ON "purchase_payment" ("supplierId", "paidAt")
    `);

        // Add foreign key constraints if not exists (TypeORM naming convention)
        await queryRunner.query(`
      DO $$
      BEGIN
        -- Drop old constraint if it exists with different name
        IF EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_purchase_payment_purchase'
        ) THEN
          ALTER TABLE "purchase_payment" DROP CONSTRAINT "FK_purchase_payment_purchase";
        END IF;
        
        -- Add TypeORM-named constraint
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_3d36aefdb19ddb291bc93ee81ca'
        ) THEN
          ALTER TABLE "purchase_payment"
          ADD CONSTRAINT "FK_3d36aefdb19ddb291bc93ee81ca"
          FOREIGN KEY ("purchaseId") REFERENCES "stock_purchase"("id") 
          ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
        
        -- Add supplier foreign key constraint
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
        await queryRunner.query(`
      ALTER TABLE IF EXISTS "purchase_payment" 
      DROP CONSTRAINT IF EXISTS "FK_3d36aefdb19ddb291bc93ee81ca"
    `);
        await queryRunner.query(`
      ALTER TABLE IF EXISTS "purchase_payment" 
      DROP CONSTRAINT IF EXISTS "FK_0c9b70b876976913b56e11e6a83"
    `);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_purchase_payment_supplier"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_purchase_payment_purchase"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "purchase_payment"`);
    }
}

