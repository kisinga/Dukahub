import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create Inventory Batch and Movement Tables
 *
 * Creates the core inventory tracking tables:
 * - inventory_batch: Tracks batches of stock with cost and expiry
 * - inventory_movement: Immutable audit trail of all stock changes
 */
export class CreateInventoryBatchAndMovementTables7100000000000 implements MigrationInterface {
  name = 'CreateInventoryBatchAndMovementTables7100000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure pgcrypto extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    // Create inventory_batch table
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "inventory_batch" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "channelId" integer NOT NULL,
                "stockLocationId" integer NOT NULL,
                "productVariantId" integer NOT NULL,
                "quantity" float NOT NULL,
                "unitCost" bigint NOT NULL,
                "expiryDate" timestamp,
                "sourceType" character varying(64) NOT NULL,
                "sourceId" character varying(255) NOT NULL,
                "metadata" jsonb,
                "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "PK_inventory_batch" PRIMARY KEY ("id"),
                CONSTRAINT "CHK_inventory_batch_quantity_non_negative" CHECK ("quantity" >= 0)
            )
        `);

    // Create inventory_movement table
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "inventory_movement" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "channelId" integer NOT NULL,
                "stockLocationId" integer NOT NULL,
                "productVariantId" integer NOT NULL,
                "movementType" character varying(32) NOT NULL,
                "quantity" float NOT NULL,
                "batchId" uuid,
                "sourceType" character varying(64) NOT NULL,
                "sourceId" character varying(255) NOT NULL,
                "metadata" jsonb,
                "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "PK_inventory_movement" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_inventory_movement_source" UNIQUE ("channelId", "sourceType", "sourceId")
            )
        `);

    // Create foreign key constraints
    await queryRunner.query(`
            ALTER TABLE "inventory_batch"
            ADD CONSTRAINT "FK_inventory_batch_channel"
            FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "inventory_batch"
            ADD CONSTRAINT "FK_inventory_batch_stock_location"
            FOREIGN KEY ("stockLocationId") REFERENCES "stock_location"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "inventory_batch"
            ADD CONSTRAINT "FK_inventory_batch_product_variant"
            FOREIGN KEY ("productVariantId") REFERENCES "product_variant"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "inventory_movement"
            ADD CONSTRAINT "FK_inventory_movement_channel"
            FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "inventory_movement"
            ADD CONSTRAINT "FK_inventory_movement_stock_location"
            FOREIGN KEY ("stockLocationId") REFERENCES "stock_location"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "inventory_movement"
            ADD CONSTRAINT "FK_inventory_movement_product_variant"
            FOREIGN KEY ("productVariantId") REFERENCES "product_variant"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "inventory_movement"
            ADD CONSTRAINT "FK_inventory_movement_batch"
            FOREIGN KEY ("batchId") REFERENCES "inventory_batch"("id") ON DELETE SET NULL
        `);

    // Create indexes for inventory_batch
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_inventory_batch_channel_location_variant_created"
            ON "inventory_batch" ("channelId", "stockLocationId", "productVariantId", "createdAt")
        `);

    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_inventory_batch_channel_source"
            ON "inventory_batch" ("channelId", "sourceType", "sourceId")
        `);

    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_inventory_batch_expiry"
            ON "inventory_batch" ("expiryDate")
        `);

    // Create indexes for inventory_movement
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_inventory_movement_channel_location_variant_created"
            ON "inventory_movement" ("channelId", "stockLocationId", "productVariantId", "createdAt")
        `);

    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_inventory_movement_batch"
            ON "inventory_movement" ("batchId")
        `);

    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_inventory_movement_type"
            ON "inventory_movement" ("movementType")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inventory_movement_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inventory_movement_batch"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_inventory_movement_channel_location_variant_created"`
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inventory_batch_expiry"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inventory_batch_channel_source"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_inventory_batch_channel_location_variant_created"`
    );

    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "inventory_movement" DROP CONSTRAINT IF EXISTS "FK_inventory_movement_batch"`
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_movement" DROP CONSTRAINT IF EXISTS "FK_inventory_movement_product_variant"`
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_movement" DROP CONSTRAINT IF EXISTS "FK_inventory_movement_stock_location"`
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_movement" DROP CONSTRAINT IF EXISTS "FK_inventory_movement_channel"`
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_batch" DROP CONSTRAINT IF EXISTS "FK_inventory_batch_product_variant"`
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_batch" DROP CONSTRAINT IF EXISTS "FK_inventory_batch_stock_location"`
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_batch" DROP CONSTRAINT IF EXISTS "FK_inventory_batch_channel"`
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_movement"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_batch"`);
  }
}
