import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignStockConstraints1765000000001 implements MigrationInterface {
  name = 'AlignStockConstraints1765000000001';
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Safely drop old FKs / indexes if they exist
    await queryRunner.query(`ALTER TABLE "stock_purchase_line" DROP CONSTRAINT IF EXISTS "FK_stock_purchase_line_purchase";`);
    await queryRunner.query(`ALTER TABLE "inventory_stock_adjustment_line" DROP CONSTRAINT IF EXISTS "FK_inventory_stock_adjustment_line_adjustment";`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_purchase_supplier";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_purchase_date";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_purchase_line_purchase";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inventory_stock_adjustment_created";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inventory_stock_adjustment_line_adjustment";`);

    // Ensure columns exist and defaults are set
    await queryRunner.query(`ALTER TABLE "inventory_stock_adjustment" ADD COLUMN IF NOT EXISTS "adjustedById" integer;`);
    await queryRunner.query(`ALTER TABLE "stock_purchase" ALTER COLUMN "createdAt" SET DEFAULT now();`);
    await queryRunner.query(`ALTER TABLE "stock_purchase" ALTER COLUMN "updatedAt" SET DEFAULT now();`);
    await queryRunner.query(`ALTER TABLE "inventory_stock_adjustment" ALTER COLUMN "createdAt" SET DEFAULT now();`);
    await queryRunner.query(`ALTER TABLE "inventory_stock_adjustment" ALTER COLUMN "updatedAt" SET DEFAULT now();`);

    // Add the desired FKs if not present
    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FK_bd427f6597557b41d91f40c73ec'
      ) THEN
        ALTER TABLE "stock_purchase_line"
        ADD CONSTRAINT "FK_bd427f6597557b41d91f40c73ec"
        FOREIGN KEY ("purchaseId")
        REFERENCES "stock_purchase"("id")
        ON DELETE CASCADE
        ON UPDATE NO ACTION;
      END IF;
    END $$;`);

    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FK_204dc9892273a53354efc1ffd23'
      ) THEN
        ALTER TABLE "inventory_stock_adjustment_line"
        ADD CONSTRAINT "FK_204dc9892273a53354efc1ffd23"
        FOREIGN KEY ("adjustmentId")
        REFERENCES "inventory_stock_adjustment"("id")
        ON DELETE CASCADE
        ON UPDATE NO ACTION;
      END IF;
    END $$;`);
  }

  public async down(): Promise<void> {
    // No-op: idempotent alignment migration
  }
}


