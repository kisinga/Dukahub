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
   * Creates all required accounts if they don't exist
   */
  async initializeForChannel(channelId: number): Promise<void> {
    const accountRepo = this.dataSource.getRepository(Account);

    const requiredAccounts = [
      // Assets
      { code: ACCOUNT_CODES.CASH_ON_HAND, name: 'Cash on Hand', type: 'asset' as const },
      { code: ACCOUNT_CODES.BANK_MAIN, name: 'Bank - Main', type: 'asset' as const },
      { code: ACCOUNT_CODES.CLEARING_MPESA, name: 'Clearing - M-Pesa', type: 'asset' as const },
      {
        code: ACCOUNT_CODES.CLEARING_CREDIT,
        name: 'Clearing - Customer Credit',
        type: 'asset' as const,
      },
      { code: ACCOUNT_CODES.CLEARING_GENERIC, name: 'Clearing - Generic', type: 'asset' as const },
      // Income
      { code: ACCOUNT_CODES.SALES, name: 'Sales Revenue', type: 'income' as const },
      { code: ACCOUNT_CODES.SALES_RETURNS, name: 'Sales Returns', type: 'income' as const },
      // Assets (continued - AR is an asset)
      {
        code: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
        name: 'Accounts Receivable',
        type: 'asset' as const,
      },
      // Liabilities
      {
        code: ACCOUNT_CODES.ACCOUNTS_PAYABLE,
        name: 'Accounts Payable',
        type: 'liability' as const,
      },
      { code: ACCOUNT_CODES.TAX_PAYABLE, name: 'Taxes Payable', type: 'liability' as const },
      // Expenses
      { code: ACCOUNT_CODES.PURCHASES, name: 'Inventory Purchases', type: 'expense' as const },
      { code: ACCOUNT_CODES.EXPENSES, name: 'General Expenses', type: 'expense' as const },
      {
        code: ACCOUNT_CODES.PROCESSOR_FEES,
        name: 'Payment Processor Fees',
        type: 'expense' as const,
      },
      { code: ACCOUNT_CODES.CASH_SHORT_OVER, name: 'Cash Short/Over', type: 'expense' as const },
    ];

    for (const account of requiredAccounts) {
      const existing = await accountRepo.findOne({
        where: {
          channelId,
          code: account.code,
        },
      });

      if (!existing) {
        await accountRepo.save({
          channelId,
          code: account.code,
          name: account.name,
          type: account.type,
          isActive: true,
        });
        this.logger.log(`Created account ${account.code} for channel ${channelId}`);
      }
    }

    this.logger.log(`Chart of Accounts initialized for channel ${channelId}`);
  }

  /**
   * Verify all required accounts exist for a channel
   * Throws if any are missing
   */
  async verifyChannelAccounts(channelId: number): Promise<void> {
    const accountRepo = this.dataSource.getRepository(Account);
    // Use constants from single source of truth
    const requiredCodes = [
      ACCOUNT_CODES.CASH_ON_HAND,
      ACCOUNT_CODES.BANK_MAIN,
      ACCOUNT_CODES.CLEARING_MPESA,
      ACCOUNT_CODES.CLEARING_CREDIT,
      ACCOUNT_CODES.CLEARING_GENERIC,
      ACCOUNT_CODES.SALES,
      ACCOUNT_CODES.SALES_RETURNS,
      ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
      ACCOUNT_CODES.ACCOUNTS_PAYABLE,
      ACCOUNT_CODES.TAX_PAYABLE,
      ACCOUNT_CODES.PURCHASES,
      ACCOUNT_CODES.EXPENSES,
      ACCOUNT_CODES.PROCESSOR_FEES,
      ACCOUNT_CODES.CASH_SHORT_OVER,
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
