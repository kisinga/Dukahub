import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ensure GIN Indexes Exist
 * 
 * TypeORM doesn't support GIN indexes via decorators, so these must be managed by migration.
 * This migration ensures they exist even if TypeORM tries to drop them during schema sync.
 * 
 * Idempotent - safe to run multiple times.
 */
export class EnsureGinIndexes1766000500000 implements MigrationInterface {
  name = 'EnsureGinIndexes1766000500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // GIN indexes for customer/supplier balance queries (via meta JSONB)
    // These cannot be defined in TypeORM decorators, so always ensure they exist
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
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_journal_line_meta_supplier"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_journal_line_meta_customer"`);
  }
}

