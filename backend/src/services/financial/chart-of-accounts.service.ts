import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ACCOUNT_CODES } from '../../ledger/account-codes.constants';
import { Account } from '../../ledger/account.entity';

/**
 * Chart of Accounts Service
 *
 * Manages initialization of required accounts for channels.
 * Should be called when a new channel is created.
 */
@Injectable()
export class ChartOfAccountsService {
  private readonly logger = new Logger(ChartOfAccountsService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Initialize Chart of Accounts for a channel
   * Creates all required accounts if they don't exist.
   *
   * Account Type Classifications:
   * - Assets: Resources owned by the business (cash, bank, receivables, clearing accounts)
   * - Liabilities: Obligations owed by the business (payables, tax obligations)
   * - Income: Revenue from business operations (sales, contra-revenue like returns)
   * - Expenses: Costs incurred in business operations (purchases, fees, general expenses)
   *
   * Note: SALES_RETURNS is classified as income (contra-revenue account) where returns
   * reduce revenue through negative balances. This follows standard accounting practice
   * for contra-revenue accounts.
   *
   * Note: CLEARING_CREDIT is a temporary clearing account for customer credit/store credit
   * transactions. It's classified as an asset because it represents funds temporarily held
   * before allocation, similar to other clearing accounts.
   */
  async initializeForChannel(channelId: number): Promise<void> {
    const accountRepo = this.dataSource.getRepository(Account);

    // First, create parent accounts
    const parentAccounts = [
      { code: ACCOUNT_CODES.CASH, name: 'Cash', type: 'asset' as const, isParent: true },
    ];

    for (const account of parentAccounts) {
      const existing = await accountRepo.findOne({
        where: {
          channelId,
          code: account.code,
        },
      });

      if (!existing) {
        try {
          await accountRepo.save({
            channelId,
            code: account.code,
            name: account.name,
            type: account.type,
            isActive: true,
            isParent: account.isParent,
          });
          this.logger.log(
            `Created parent account ${account.code} (${account.type}) for channel ${channelId}`
          );
        } catch (error: any) {
          if (error.code === '23505' || error.message?.includes('unique constraint')) {
            this.logger.warn(
              `Parent account ${account.code} already exists for channel ${channelId}`
            );
          } else {
            throw error;
          }
        }
      } else {
        // Update existing account to be a parent if needed
        if (!existing.isParent) {
          await accountRepo.update(existing.id, { isParent: true });
        }
      }
    }

    // Get CASH parent account ID
    const cashParent = await accountRepo.findOne({
      where: {
        channelId,
        code: ACCOUNT_CODES.CASH,
      },
    });

    if (!cashParent) {
      throw new Error(`CASH parent account not found for channel ${channelId}`);
    }

    const requiredAccounts = [
      // Asset Accounts - Resources owned by the business
      // Cash-based payment method accounts (sub-accounts under CASH)
      {
        code: ACCOUNT_CODES.CASH_ON_HAND,
        name: 'Cash on Hand',
        type: 'asset' as const,
        parentAccountId: cashParent.id,
      },
      {
        code: ACCOUNT_CODES.BANK_MAIN,
        name: 'Bank - Main',
        type: 'asset' as const,
        parentAccountId: cashParent.id,
      },
      {
        code: ACCOUNT_CODES.CLEARING_MPESA,
        name: 'Clearing - M-Pesa',
        type: 'asset' as const,
        parentAccountId: cashParent.id,
      },
      // Standalone asset accounts (not sub-accounts)
      {
        code: ACCOUNT_CODES.CLEARING_CREDIT,
        name: 'Clearing - Customer Credit',
        type: 'asset' as const,
        parentAccountId: undefined,
      },
      {
        code: ACCOUNT_CODES.CLEARING_GENERIC,
        name: 'Clearing - Generic',
        type: 'asset' as const,
        parentAccountId: undefined,
      },
      {
        code: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
        name: 'Accounts Receivable',
        type: 'asset' as const,
        parentAccountId: undefined,
      },
      {
        code: ACCOUNT_CODES.INVENTORY,
        name: 'Inventory',
        type: 'asset' as const,
        parentAccountId: undefined,
      },
      // Income Accounts - Revenue from business operations
      { code: ACCOUNT_CODES.SALES, name: 'Sales Revenue', type: 'income' as const },
      {
        code: ACCOUNT_CODES.SALES_RETURNS,
        name: 'Sales Returns',
        type: 'income' as const, // Contra-revenue account (reduces revenue)
      },
      // Liability Accounts - Obligations owed by the business
      {
        code: ACCOUNT_CODES.ACCOUNTS_PAYABLE,
        name: 'Accounts Payable',
        type: 'liability' as const,
      },
      { code: ACCOUNT_CODES.TAX_PAYABLE, name: 'Taxes Payable', type: 'liability' as const },
      // Expense Accounts - Costs incurred in business operations
      { code: ACCOUNT_CODES.PURCHASES, name: 'Inventory Purchases', type: 'expense' as const },
      { code: ACCOUNT_CODES.EXPENSES, name: 'General Expenses', type: 'expense' as const },
      {
        code: ACCOUNT_CODES.PROCESSOR_FEES,
        name: 'Payment Processor Fees',
        type: 'expense' as const,
      },
      { code: ACCOUNT_CODES.CASH_SHORT_OVER, name: 'Cash Short/Over', type: 'expense' as const },
      { code: ACCOUNT_CODES.COGS, name: 'Cost of Goods Sold', type: 'expense' as const },
      {
        code: ACCOUNT_CODES.INVENTORY_WRITE_OFF,
        name: 'Inventory Write-Off',
        type: 'expense' as const,
      },
      { code: ACCOUNT_CODES.EXPIRY_LOSS, name: 'Expiry Loss', type: 'expense' as const },
    ];

    let createdCount = 0;
    let existingCount = 0;

    for (const account of requiredAccounts) {
      const existing = await accountRepo.findOne({
        where: {
          channelId,
          code: account.code,
        },
      });

      if (!existing) {
        try {
          await accountRepo.save({
            channelId,
            code: account.code,
            name: account.name,
            type: account.type,
            isActive: true,
            parentAccountId: (account as any).parentAccountId,
            isParent: false,
          });
          createdCount++;
          this.logger.log(
            `Created account ${account.code} (${account.type}) for channel ${channelId}`
          );
        } catch (error: any) {
          // Handle unique constraint violations gracefully
          if (error.code === '23505' || error.message?.includes('unique constraint')) {
            this.logger.warn(
              `Account ${account.code} already exists for channel ${channelId} (race condition handled)`
            );
            existingCount++;
          } else {
            this.logger.error(
              `Failed to create account ${account.code} for channel ${channelId}: ${error.message}`,
              error.stack
            );
            throw error;
          }
        }
      } else {
        existingCount++;
        // Update parentAccountId if not set
        if ((account as any).parentAccountId && !existing.parentAccountId) {
          await accountRepo.update(existing.id, {
            parentAccountId: (account as any).parentAccountId,
          });
        }
        // Verify existing account has correct type (data integrity check)
        if (existing.type !== account.type) {
          this.logger.warn(
            `Account ${account.code} for channel ${channelId} has incorrect type: ` +
              `expected ${account.type}, found ${existing.type}. Consider manual correction.`
          );
        }
      }
    }

    this.logger.log(
      `Chart of Accounts initialized for channel ${channelId}: ` +
        `${createdCount} created, ${existingCount} already existed`
    );
  }

  /**
   * Verify all required accounts exist for a channel
   * Throws if any are missing
   */
  async verifyChannelAccounts(channelId: number): Promise<void> {
    const accountRepo = this.dataSource.getRepository(Account);
    // Use constants from single source of truth
    const requiredCodes = [
      ACCOUNT_CODES.CASH, // Parent account
      ACCOUNT_CODES.CASH_ON_HAND,
      ACCOUNT_CODES.BANK_MAIN,
      ACCOUNT_CODES.CLEARING_MPESA,
      ACCOUNT_CODES.CLEARING_CREDIT,
      ACCOUNT_CODES.CLEARING_GENERIC,
      ACCOUNT_CODES.SALES,
      ACCOUNT_CODES.SALES_RETURNS,
      ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
      ACCOUNT_CODES.INVENTORY,
      ACCOUNT_CODES.ACCOUNTS_PAYABLE,
      ACCOUNT_CODES.TAX_PAYABLE,
      ACCOUNT_CODES.PURCHASES,
      ACCOUNT_CODES.EXPENSES,
      ACCOUNT_CODES.PROCESSOR_FEES,
      ACCOUNT_CODES.CASH_SHORT_OVER,
      ACCOUNT_CODES.COGS,
      ACCOUNT_CODES.INVENTORY_WRITE_OFF,
      ACCOUNT_CODES.EXPIRY_LOSS,
    ];

    const existing = await accountRepo.find({
      where: {
        channelId,
        code: requiredCodes as any,
      },
    });

    const found = new Set(existing.map(a => a.code));
    const missing = requiredCodes.filter(code => !found.has(code));

    if (missing.length > 0) {
      throw new Error(
        `Missing required accounts for channel ${channelId}: ${missing.join(', ')}. ` +
          `Please run ChartOfAccountsService.initializeForChannel(${channelId})`
      );
    }
  }
}
