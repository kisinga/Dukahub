import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * FixLedgerSchemaDiff
 *
 * Aligns the live DB schema with the current TypeORM metadata for the new
 * ledger-related tables. This is purely structural and safe to run on
 * existing and new databases (fully idempotent).
 */
export class FixLedgerSchemaDiff1765000000002 implements MigrationInterface {
  name = 'FixLedgerSchemaDiff1765000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop legacy FK names if they exist
    await queryRunner.query(
      `ALTER TABLE "ledger_journal_line" DROP CONSTRAINT IF EXISTS "FK_line_account";`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_journal_line" DROP CONSTRAINT IF EXISTS "FK_line_entry";`,
    );

    // Drop legacy index names if they exist
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ledger_account_channel_code";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_journal_line_entry";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_journal_entry_source";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_period_lock_channel";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_money_event_source";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cashier_session_opened";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_recon_range";`);

    // Ensure unique constraint on period_lock.channelId with the expected name
    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UQ_0a2327f3ce9a3e0335d62b02380'
      ) THEN
        ALTER TABLE "period_lock"
        ADD CONSTRAINT "UQ_0a2327f3ce9a3e0335d62b02380" UNIQUE ("channelId");
      END IF;
    END $$;`);

    // Ensure expected indexes exist
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_e9a270270815811eeca8b2ed5c" ON "ledger_account" ("channelId","code");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_f9cd7e4e7ad494c04ac5fc2524" ON "ledger_journal_line" ("entryId");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_2bfa5e2744f391a3887f3d82c4" ON "cashier_session" ("channelId","openedAt");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_4baeb5137224fe3eef32c75b66" ON "reconciliation" ("channelId","rangeStart","rangeEnd");`,
    );

    // Ensure expected unique constraints on journal_entry and money_event sources
    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_journal_entry_source'
      ) THEN
        ALTER TABLE "ledger_journal_entry"
        ADD CONSTRAINT "uq_journal_entry_source" UNIQUE ("channelId","sourceType","sourceId");
      END IF;
    END $$;`);

    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_money_event_source'
      ) THEN
        ALTER TABLE "money_event"
        ADD CONSTRAINT "uq_money_event_source" UNIQUE ("channelId","sourceType","sourceId");
      END IF;
    END $$;`);

    // Ensure expected FK constraint names for ledger_journal_line
    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FK_f9cd7e4e7ad494c04ac5fc25244'
      ) THEN
        ALTER TABLE "ledger_journal_line"
        ADD CONSTRAINT "FK_f9cd7e4e7ad494c04ac5fc25244"
        FOREIGN KEY ("entryId")
        REFERENCES "ledger_journal_entry"("id")
        ON DELETE CASCADE
        ON UPDATE NO ACTION;
      END IF;
    END $$;`);

    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FK_185fa35d92d3dc5aebc6c6e284c'
      ) THEN
        ALTER TABLE "ledger_journal_line"
        ADD CONSTRAINT "FK_185fa35d92d3dc5aebc6c6e284c"
        FOREIGN KEY ("accountId")
        REFERENCES "ledger_account"("id")
        ON DELETE RESTRICT
        ON UPDATE NO ACTION;
      END IF;
    END $$;`);
  }

  // Down is intentionally a no-op: this migration only normalizes names/constraints.
  public async down(): Promise<void> {
    return;
  }
}




