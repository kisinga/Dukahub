import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drops legacy foreign-key constraints and indexes that are no longer needed.
 * This keeps the runtime schema aligned with current configuration and avoids
 * Vendure complaining about extra artifacts on startup.
 */
export class CleanupLegacyConstraints9000000000000 implements MigrationInterface {
  name = 'CleanupLegacyConstraints9000000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment" DROP CONSTRAINT IF EXISTS "FK_payment_added_by_user"`
    );
    await queryRunner.query(
      `ALTER TABLE "order" DROP CONSTRAINT IF EXISTS "FK_order_created_by_user"`
    );
    await queryRunner.query(
      `ALTER TABLE "order" DROP CONSTRAINT IF EXISTS "FK_order_last_modified_by_user"`
    );
    await queryRunner.query(
      `ALTER TABLE "customer" DROP CONSTRAINT IF EXISTS "FK_customer_credit_approved_by_user"`
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_purchase_supplier"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_purchase_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_purchase_line_purchase"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inventory_stock_adjustment_created"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_inventory_stock_adjustment_line_adjustment"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user') THEN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment') AND
             NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_payment_added_by_user') THEN
            ALTER TABLE "payment"
            ADD CONSTRAINT "FK_payment_added_by_user"
            FOREIGN KEY ("customFieldsAddedbyuseridid")
            REFERENCES "user"("id")
            ON DELETE SET NULL
            ON UPDATE NO ACTION;
          END IF;

          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_order_created_by_user') THEN
              ALTER TABLE "order"
              ADD CONSTRAINT "FK_order_created_by_user"
              FOREIGN KEY ("customFieldsCreatedbyuseridid")
              REFERENCES "user"("id")
              ON DELETE SET NULL
              ON UPDATE NO ACTION;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_order_last_modified_by_user') THEN
              ALTER TABLE "order"
              ADD CONSTRAINT "FK_order_last_modified_by_user"
              FOREIGN KEY ("customFieldsLastmodifiedbyuseridid")
              REFERENCES "user"("id")
              ON DELETE SET NULL
              ON UPDATE NO ACTION;
            END IF;
          END IF;

          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer') AND
             NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_customer_credit_approved_by_user') THEN
            ALTER TABLE "customer"
            ADD CONSTRAINT "FK_customer_credit_approved_by_user"
            FOREIGN KEY ("customFieldsCreditapprovedbyuseridid")
            REFERENCES "user"("id")
            ON DELETE SET NULL
            ON UPDATE NO ACTION;
          END IF;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_stock_purchase_supplier"
      ON "stock_purchase" ("supplierId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_stock_purchase_date"
      ON "stock_purchase" ("purchaseDate")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_stock_purchase_line_purchase"
      ON "stock_purchase_line" ("purchaseId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inventory_stock_adjustment_created"
      ON "inventory_stock_adjustment" ("createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inventory_stock_adjustment_line_adjustment"
      ON "inventory_stock_adjustment_line" ("adjustmentId")
    `);
  }
}
