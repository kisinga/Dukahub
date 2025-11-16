import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfill Ledger from Existing Data
 * 
 * NOTE: This migration is a no-op as we're starting fresh with the ledger.
 * All financial data going forward will be posted to the ledger via FinancialService
 * in the same transaction as domain changes.
 * 
 * If you need to backfill historical data, you can create a custom script,
 * but for new deployments, the ledger starts empty and builds up from new transactions.
 */
export class BackfillLedgerFromExistingData1766000300000 implements MigrationInterface {
    name = 'BackfillLedgerFromExistingData1766000300000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // No-op: Starting fresh with ledger as source of truth
        // All new transactions will post to ledger automatically
        console.log('Ledger backfill skipped - starting fresh');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No-op: Nothing to rollback
    }
}

