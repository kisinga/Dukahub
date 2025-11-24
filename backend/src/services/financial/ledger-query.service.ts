import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RequestContext } from '@vendure/core';
import { ACCOUNT_CODES } from '../../ledger/account-codes.constants';
import { Account } from '../../ledger/account.entity';
import { JournalLine } from '../../ledger/journal-line.entity';
import { AccountBalanceService } from './account-balance.service';

export interface BalanceQuery {
  channelId: number;
  accountCode: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  customerId?: string; // For AR account filtering
  supplierId?: string; // For AP account filtering
  orderId?: string; // For order-scoped AR queries
}

export interface AccountBalance {
  accountCode: string;
  accountName: string;
  balance: number; // in cents, positive = debit balance (assets/expenses), negative = credit balance (liabilities/income)
  debitTotal: number;
  creditTotal: number;
}

/**
 * Ledger Query Service
 *
 * IMPORTANT: The ledger is the SINGLE SOURCE OF TRUTH for all financial figures.
 * All balances, totals, and financial calculations MUST come from the ledger (journal lines).
 * Do NOT calculate financial figures by aggregating orders, payments, or other entities directly.
 *
 * This service provides:
 * - Account balance queries (delegates to AccountBalanceService for consistency)
 * - Period-based totals (sales, purchases, expenses) from ledger accounts
 * - Customer/supplier balance queries with filtering
 */
@Injectable()
export class LedgerQueryService {
  private readonly logger = new Logger(LedgerQueryService.name);
  private balanceCache = new Map<string, { balance: number; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 1 minute

  constructor(
    private readonly dataSource: DataSource,
    private readonly accountBalanceService: AccountBalanceService
  ) {}

  /**
   * Get account balance from ledger
   *
   * IMPORTANT: This queries the ledger (journal lines) as the single source of truth.
   * For basic balance queries, delegates to AccountBalanceService for consistency and parent account rollup support.
   * For queries with customer/supplier/order filtering, uses direct journal line queries.
   *
   * For assets/expenses: positive balance = debit (normal)
   * For liabilities/income: negative balance = credit (normal)
   */
  async getAccountBalance(query: BalanceQuery): Promise<AccountBalance> {
    // If no special filtering (customer/supplier/order), use AccountBalanceService for consistency
    if (!query.customerId && !query.supplierId && !query.orderId) {
      // Check cache first
      const cacheKey = this.getCacheKey(query);
      const cached = this.balanceCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        // Need to get account name, but use cached balance
        const account = await this.dataSource.getRepository(Account).findOne({
          where: {
            channelId: query.channelId,
            code: query.accountCode,
          },
        });

        return {
          accountCode: query.accountCode,
          accountName: account?.name || '',
          balance: cached.balance,
          debitTotal: 0,
          creditTotal: 0,
        };
      }

      // Use AccountBalanceService for consistency and parent account rollup support
      // Create a minimal RequestContext for AccountBalanceService
      const ctx = {
        channelId: query.channelId,
      } as RequestContext;

      const balance = await this.accountBalanceService.getAccountBalance(
        ctx,
        query.accountCode,
        query.channelId,
        query.endDate
      );

      // Cache the result
      this.balanceCache.set(cacheKey, {
        balance: balance.balance,
        timestamp: Date.now(),
      });

      return balance;
    }

    // For queries with customer/supplier/order filtering, use direct journal line queries
    // (AccountBalanceService doesn't support these filters)
    const account = await this.dataSource.getRepository(Account).findOne({
      where: {
        channelId: query.channelId,
        code: query.accountCode,
      },
    });

    if (!account) {
      throw new Error(`Account ${query.accountCode} not found for channel ${query.channelId}`);
    }

    let queryBuilder = this.dataSource
      .getRepository(JournalLine)
      .createQueryBuilder('line')
      .innerJoin('line.entry', 'entry')
      .where('line.channelId = :channelId', { channelId: query.channelId })
      .andWhere('line.accountId = :accountId', { accountId: account.id });

    if (query.startDate) {
      queryBuilder = queryBuilder.andWhere('entry.entryDate >= :startDate', {
        startDate: query.startDate,
      });
    }

    if (query.endDate) {
      queryBuilder = queryBuilder.andWhere('entry.entryDate <= :endDate', {
        endDate: query.endDate,
      });
    }

    // Filter by customer/supplier if provided (via meta field)
    if (query.customerId) {
      queryBuilder = queryBuilder.andWhere('line.meta @> :customerFilter', {
        customerFilter: JSON.stringify({ customerId: query.customerId }),
      });
    }

    if (query.supplierId) {
      queryBuilder = queryBuilder.andWhere('line.meta @> :supplierFilter', {
        supplierFilter: JSON.stringify({ supplierId: query.supplierId }),
      });
    }

    if (query.orderId) {
      queryBuilder = queryBuilder.andWhere('line.meta @> :orderFilter', {
        orderFilter: JSON.stringify({ orderId: query.orderId }),
      });
    }

    const result = await queryBuilder
      .select('SUM(CAST(line.debit AS BIGINT))', 'debitTotal')
      .addSelect('SUM(CAST(line.credit AS BIGINT))', 'creditTotal')
      .getRawOne();

    const debitTotal = parseInt(result?.debitTotal || '0', 10);
    const creditTotal = parseInt(result?.creditTotal || '0', 10);
    const balance = debitTotal - creditTotal;

    // Cache the result
    const cacheKey = this.getCacheKey(query);
    this.balanceCache.set(cacheKey, {
      balance,
      timestamp: Date.now(),
    });

    return {
      accountCode: account.code,
      accountName: account.name,
      balance,
      debitTotal,
      creditTotal,
    };
  }

  /**
   * Get customer balance (from AR account)
   * Returns positive value = customer owes us
   */
  async getCustomerBalance(channelId: number, customerId: string): Promise<number> {
    const balance = await this.getAccountBalance({
      channelId,
      accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
      customerId,
    });
    // AR is an asset account
    // When customer owes us (credit sale): Debit AR = positive balance
    // When customer pays: Credit AR = balance decreases
    // Positive balance = customer owes us (correct)
    return Math.max(0, balance.balance); // Ensure non-negative (shouldn't be negative normally)
  }

  /**
   * Get supplier balance (from AP account)
   * Returns positive value = we owe supplier
   */
  async getSupplierBalance(channelId: number, supplierId: string): Promise<number> {
    const balance = await this.getAccountBalance({
      channelId,
      accountCode: ACCOUNT_CODES.ACCOUNTS_PAYABLE,
      supplierId,
    });
    // AP is a liability account
    // When we owe supplier (credit purchase): Credit AP = balance becomes negative (liability increases)
    // When we pay supplier: Debit AP = balance becomes less negative
    // Negative balance = we owe money, so return absolute value
    return Math.abs(balance.balance);
  }

  /**
   * Get sales total for a period
   */
  async getSalesTotal(channelId: number, startDate?: string, endDate?: string): Promise<number> {
    const balance = await this.getAccountBalance({
      channelId,
      accountCode: ACCOUNT_CODES.SALES,
      startDate,
      endDate,
    });
    // Sales is income (credit normal), so negative balance = total sales
    const total = Math.abs(balance.balance);
    this.logger.debug(
      `getSalesTotal: channelId=${channelId}, startDate=${startDate}, endDate=${endDate}, balance=${balance.balance}, total=${total}`
    );
    return total;
  }

  /**
   * Get purchases total for a period
   *
   * IMPORTANT: This queries the PURCHASES account from the ledger as the single source of truth.
   * Do NOT calculate purchases by aggregating purchase records directly - use this method instead.
   */
  async getPurchaseTotal(channelId: number, startDate?: string, endDate?: string): Promise<number> {
    const balance = await this.getAccountBalance({
      channelId,
      accountCode: ACCOUNT_CODES.PURCHASES,
      startDate,
      endDate,
    });
    // Purchases is expense (debit normal), so positive balance = total purchases
    return balance.balance;
  }

  /**
   * Get expenses total for a period
   *
   * IMPORTANT: This queries the EXPENSES account from the ledger as the single source of truth.
   * Do NOT calculate expenses by aggregating expense records directly - use this method instead.
   */
  async getExpenseTotal(channelId: number, startDate?: string, endDate?: string): Promise<number> {
    const balance = await this.getAccountBalance({
      channelId,
      accountCode: ACCOUNT_CODES.EXPENSES,
      startDate,
      endDate,
    });
    // Expenses is expense (debit normal), so positive balance = total expenses
    return balance.balance;
  }

  /**
   * Get sales breakdown by payment method (cash vs credit)
   * Returns cash sales and credit sales totals for a period
   *
   * Cash sales = debits to CASH_ON_HAND and CLEARING_MPESA that are part of sales entries
   * Credit sales = debits to ACCOUNTS_RECEIVABLE that are part of sales entries
   *
   * We filter by entries that also have SALES credits to ensure we only count sales transactions
   */
  async getSalesBreakdown(
    channelId: number,
    startDate?: string,
    endDate?: string
  ): Promise<{ cashSales: number; creditSales: number }> {
    // Get SALES account
    const salesAccount = await this.dataSource.getRepository(Account).findOne({
      where: {
        channelId,
        code: ACCOUNT_CODES.SALES,
      },
    });

    if (!salesAccount) {
      return { cashSales: 0, creditSales: 0 };
    }

    // Get cash accounts
    const cashOnHandAccount = await this.dataSource.getRepository(Account).findOne({
      where: {
        channelId,
        code: ACCOUNT_CODES.CASH_ON_HAND,
      },
    });

    const mpesaAccount = await this.dataSource.getRepository(Account).findOne({
      where: {
        channelId,
        code: ACCOUNT_CODES.CLEARING_MPESA,
      },
    });

    // Get AR account
    const arAccount = await this.dataSource.getRepository(Account).findOne({
      where: {
        channelId,
        code: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
      },
    });

    if (!cashOnHandAccount || !mpesaAccount || !arAccount) {
      return { cashSales: 0, creditSales: 0 };
    }

    // Query for cash sales: debits to CASH_ON_HAND or CLEARING_MPESA in entries that also credit SALES
    // Use EXISTS subquery to check if entry has SALES credit
    let cashSalesQuery = this.dataSource
      .getRepository(JournalLine)
      .createQueryBuilder('line')
      .innerJoin('line.entry', 'entry')
      .where('line.channelId = :channelId', { channelId })
      .andWhere('(line.accountId = :cashAccountId OR line.accountId = :mpesaAccountId)', {
        cashAccountId: cashOnHandAccount.id,
        mpesaAccountId: mpesaAccount.id,
      })
      .andWhere('CAST(line.debit AS BIGINT) > 0')
      .andWhere(
        `EXISTS (
          SELECT 1 FROM ledger_journal_line salesLine
          WHERE salesLine."entryId" = entry.id
          AND salesLine."accountId" = :salesAccountId
          AND CAST(salesLine.credit AS BIGINT) > 0
        )`,
        { salesAccountId: salesAccount.id }
      );

    // Query for credit sales: debits to ACCOUNTS_RECEIVABLE in entries that also credit SALES
    let creditSalesQuery = this.dataSource
      .getRepository(JournalLine)
      .createQueryBuilder('line')
      .innerJoin('line.entry', 'entry')
      .where('line.channelId = :channelId', { channelId })
      .andWhere('line.accountId = :arAccountId', { arAccountId: arAccount.id })
      .andWhere('CAST(line.debit AS BIGINT) > 0')
      .andWhere(
        `EXISTS (
          SELECT 1 FROM ledger_journal_line salesLine
          WHERE salesLine."entryId" = entry.id
          AND salesLine."accountId" = :salesAccountId
          AND CAST(salesLine.credit AS BIGINT) > 0
        )`,
        { salesAccountId: salesAccount.id }
      );

    // Apply date filters
    if (startDate) {
      cashSalesQuery = cashSalesQuery.andWhere('entry.entryDate >= :startDate', { startDate });
      creditSalesQuery = creditSalesQuery.andWhere('entry.entryDate >= :startDate', { startDate });
    }

    if (endDate) {
      cashSalesQuery = cashSalesQuery.andWhere('entry.entryDate <= :endDate', { endDate });
      creditSalesQuery = creditSalesQuery.andWhere('entry.entryDate <= :endDate', { endDate });
    }

    // Get totals
    const cashSalesResult = await cashSalesQuery
      .select('SUM(CAST(line.debit AS BIGINT))', 'total')
      .getRawOne();

    const creditSalesResult = await creditSalesQuery
      .select('SUM(CAST(line.debit AS BIGINT))', 'total')
      .getRawOne();

    const cashSales = parseInt(cashSalesResult?.total || '0', 10);
    const creditSales = parseInt(creditSalesResult?.total || '0', 10);

    return {
      cashSales,
      creditSales,
    };
  }

  /**
   * Calculate period boundaries (today, week, month start dates)
   * Returns dates in YYYY-MM-DD format
   */
  calculatePeriods(fromDate: Date = new Date()): {
    startOfToday: string;
    startOfWeek: string;
    startOfMonth: string;
  } {
    const startOfMonth = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);

    const startOfWeek = new Date(fromDate);
    startOfWeek.setDate(fromDate.getDate() - fromDate.getDay()); // Start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfToday = new Date(fromDate);
    startOfToday.setHours(0, 0, 0, 0);

    return {
      startOfToday: startOfToday.toISOString().slice(0, 10),
      startOfWeek: startOfWeek.toISOString().slice(0, 10),
      startOfMonth: startOfMonth.toISOString().slice(0, 10),
    };
  }

  /**
   * Invalidate cache for an account
   */
  invalidateCache(channelId: number, accountCode: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.balanceCache.keys()) {
      if (key.includes(`${channelId}:${accountCode}`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.balanceCache.delete(key));
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.balanceCache.clear();
  }

  private getCacheKey(query: BalanceQuery): string {
    return `${query.channelId}:${query.accountCode}:${query.startDate || ''}:${query.endDate || ''}:${query.customerId || ''}:${query.supplierId || ''}:${query.orderId || ''}`;
  }
}
