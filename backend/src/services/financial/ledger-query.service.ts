import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JournalLine } from '../../ledger/journal-line.entity';
import { Account } from '../../ledger/account.entity';

export interface BalanceQuery {
  channelId: number;
  accountCode: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  customerId?: string; // For AR account filtering
  supplierId?: string; // For AP account filtering
}

export interface AccountBalance {
  accountCode: string;
  accountName: string;
  balance: number; // in cents, positive = debit balance (assets/expenses), negative = credit balance (liabilities/income)
  debitTotal: number;
  creditTotal: number;
}

@Injectable()
export class LedgerQueryService {
  private readonly logger = new Logger(LedgerQueryService.name);
  private balanceCache = new Map<string, { balance: number; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 1 minute

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Get account balance from ledger
   * 
   * For assets/expenses: positive balance = debit (normal)
   * For liabilities/income: negative balance = credit (normal)
   */
  async getAccountBalance(query: BalanceQuery): Promise<AccountBalance> {
    const cacheKey = this.getCacheKey(query);
    const cached = this.balanceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return {
        accountCode: query.accountCode,
        accountName: '',
        balance: cached.balance,
        debitTotal: 0,
        creditTotal: 0,
      };
    }

    const account = await this.dataSource
      .getRepository(Account)
      .findOne({
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
      queryBuilder = queryBuilder.andWhere("line.meta->>'customerId' = :customerId", {
        customerId: query.customerId,
      });
    }

    if (query.supplierId) {
      queryBuilder = queryBuilder.andWhere("line.meta->>'supplierId' = :supplierId", {
        supplierId: query.supplierId,
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
      accountCode: 'ACCOUNTS_RECEIVABLE',
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
      accountCode: 'ACCOUNTS_PAYABLE',
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
  async getSalesTotal(
    channelId: number,
    startDate?: string,
    endDate?: string
  ): Promise<number> {
    const balance = await this.getAccountBalance({
      channelId,
      accountCode: 'SALES',
      startDate,
      endDate,
    });
    // Sales is income (credit normal), so negative balance = total sales
    return Math.abs(balance.balance);
  }

  /**
   * Get purchases total for a period
   */
  async getPurchaseTotal(
    channelId: number,
    startDate?: string,
    endDate?: string
  ): Promise<number> {
    const balance = await this.getAccountBalance({
      channelId,
      accountCode: 'PURCHASES',
      startDate,
      endDate,
    });
    // Purchases is expense (debit normal), so positive balance = total purchases
    return balance.balance;
  }

  /**
   * Get expenses total for a period
   */
  async getExpenseTotal(
    channelId: number,
    startDate?: string,
    endDate?: string
  ): Promise<number> {
    const balance = await this.getAccountBalance({
      channelId,
      accountCode: 'EXPENSES',
      startDate,
      endDate,
    });
    // Expenses is expense (debit normal), so positive balance = total expenses
    return balance.balance;
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
    return `${query.channelId}:${query.accountCode}:${query.startDate || ''}:${query.endDate || ''}:${query.customerId || ''}:${query.supplierId || ''}`;
  }
}

