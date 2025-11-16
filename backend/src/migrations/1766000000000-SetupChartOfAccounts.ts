import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Setup Chart of Accounts for all existing channels
 * 
 * This migration ensures all channels have the required accounts.
 * For new channels, accounts should be created automatically during provisioning.
 */
export class SetupChartOfAccounts1766000000000 implements MigrationInterface {
  name = 'SetupChartOfAccounts1766000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get all channel IDs
    const channels = await queryRunner.query(`
      SELECT id FROM channel
    `);

    for (const channel of channels) {
      const channelId = channel.id;

      // Insert required accounts for this channel
      await queryRunner.query(`
        INSERT INTO ledger_account ("channelId", code, name, type, "isActive") VALUES
          (${channelId}, 'CASH_ON_HAND', 'Cash on Hand', 'asset', true),
          (${channelId}, 'BANK_MAIN', 'Bank - Main', 'asset', true),
          (${channelId}, 'CLEARING_MPESA', 'Clearing - M-Pesa', 'asset', true),
          (${channelId}, 'CLEARING_CREDIT', 'Clearing - Customer Credit', 'asset', true),
          (${channelId}, 'CLEARING_GENERIC', 'Clearing - Generic', 'asset', true),
          (${channelId}, 'SALES', 'Sales Revenue', 'income', true),
          (${channelId}, 'SALES_RETURNS', 'Sales Returns', 'income', true),
          (${channelId}, 'ACCOUNTS_RECEIVABLE', 'Accounts Receivable', 'asset', true),
          (${channelId}, 'ACCOUNTS_PAYABLE', 'Accounts Payable', 'liability', true),
          (${channelId}, 'TAX_PAYABLE', 'Taxes Payable', 'liability', true),
          (${channelId}, 'PURCHASES', 'Inventory Purchases', 'expense', true),
          (${channelId}, 'EXPENSES', 'General Expenses', 'expense', true),
          (${channelId}, 'PROCESSOR_FEES', 'Payment Processor Fees', 'expense', true),
          (${channelId}, 'CASH_SHORT_OVER', 'Cash Short/Over', 'expense', true)
        ON CONFLICT ("channelId", code) DO NOTHING
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove accounts (but keep existing journal entries for audit)
    // In practice, you may not want to delete accounts that have transactions
    // This is a destructive operation - use with caution
    await queryRunner.query(`
      DELETE FROM ledger_account 
      WHERE code IN (
        'CASH_ON_HAND', 'BANK_MAIN', 'CLEARING_MPESA', 'CLEARING_CREDIT', 'CLEARING_GENERIC',
        'SALES', 'SALES_RETURNS',
        'ACCOUNTS_RECEIVABLE', 'ACCOUNTS_PAYABLE', 'TAX_PAYABLE',
        'PURCHASES', 'EXPENSES', 'PROCESSOR_FEES', 'CASH_SHORT_OVER'
      )
    `);
  }
}

