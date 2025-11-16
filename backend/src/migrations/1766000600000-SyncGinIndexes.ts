import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sync GIN Indexes with TypeORM Schema
 * 
 * TypeORM detects these indexes as "extra" because they can't be defined via decorators.
 * This migration satisfies TypeORM's schema check by acknowledging the indexes exist
 * and ensuring they're properly maintained.
 * 
 * This is a no-op migration that documents the GIN indexes for TypeORM's schema tracking.
 */
export class SyncGinIndexes1766000600000 implements MigrationInterface {
  name = 'SyncGinIndexes1766000600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // TypeORM wants to drop these indexes, but we need them for performance
    // Instead of dropping, we ensure they exist with the correct definition
    
    // Drop and recreate to ensure they match our definition exactly
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_journal_line_meta_customer";
    `);
    
    await queryRunner.query(`
      CREATE INDEX "IDX_journal_line_meta_customer" 
      ON "ledger_journal_line" USING GIN ("meta" jsonb_path_ops)
      WHERE "meta"->>'customerId' IS NOT NULL
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_journal_line_meta_supplier";
    `);
    
    await queryRunner.query(`
      CREATE INDEX "IDX_journal_line_meta_supplier" 
      ON "ledger_journal_line" USING GIN ("meta" jsonb_path_ops)
      WHERE "meta"->>'supplierId' IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Don't drop in down migration - these indexes are needed for performance
    // If TypeORM schema sync wants to drop them, it will, but migrations will recreate them
    // This is intentional - GIN indexes can't be defined in TypeORM decorators
  }
}

