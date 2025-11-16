import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add performance indexes for ledger queries
 */
export class AddLedgerIndexes1766000200000 implements MigrationInterface {
  name = 'AddLedgerIndexes1766000200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Index for account balance queries (channel + account + date range)
    // Idempotent: drop and recreate to ensure it matches entity definition
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_journal_line_account_channel_date";
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_journal_line_account_channel_date" 
      ON "ledger_journal_line" ("accountId", "channelId")
    `);

    // Index for journal entry date queries
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_journal_entry_channel_date";
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_journal_entry_channel_date" 
      ON "ledger_journal_entry" ("channelId", "entryDate")
    `);

    // Index for purchase payment queries
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_purchase_payment_purchase";
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_purchase_payment_purchase" 
      ON "purchase_payment" ("purchaseId")
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_purchase_payment_supplier";
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_purchase_payment_supplier" 
      ON "purchase_payment" ("supplierId", "paidAt")
    `);

    // Note: GIN indexes (IDX_journal_line_meta_customer, IDX_journal_line_meta_supplier)
    // are created by migration 1766000500000-EnsureGinIndexes
    // TypeORM doesn't support GIN indexes via decorators
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: GIN indexes are dropped by migration 1766000500000-EnsureGinIndexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_purchase_payment_supplier"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_purchase_payment_purchase"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_journal_entry_channel_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_journal_line_account_channel_date"`);
  }
}

