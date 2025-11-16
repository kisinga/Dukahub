import { Injectable, Logger } from '@nestjs/common';
import { RequestContext } from '@vendure/core';
import { PostingService, PostingPayload } from '../../ledger/posting.service';
import { Account } from '../../ledger/account.entity';
import { DataSource } from 'typeorm';
import {
  JournalEntryTemplate,
  PaymentPostingContext,
  SalePostingContext,
  PurchasePostingContext,
  SupplierPaymentPostingContext,
  RefundPostingContext,
  createPaymentEntry,
  createCreditSaleEntry,
  createPaymentAllocationEntry,
  createSupplierPurchaseEntry,
  createSupplierPaymentEntry,
  createRefundEntry,
} from './posting-policy';

@Injectable()
export class LedgerPostingService {
  private readonly logger = new Logger(LedgerPostingService.name);

  constructor(
    private readonly postingService: PostingService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Ensure required accounts exist for a channel
   * Throws if any account is missing
   */
  async ensureAccountsExist(channelId: number, accountCodes: string[]): Promise<void> {
    const accounts = await this.dataSource
      .getRepository(Account)
      .createQueryBuilder('a')
      .where('a.channelId = :channelId', { channelId })
      .andWhere('a.code IN (:...codes)', { codes: accountCodes })
      .getMany();

    const found = new Set(accounts.map(a => a.code));
    const missing = accountCodes.filter(code => !found.has(code));

    if (missing.length > 0) {
      throw new Error(
        `Missing required accounts for channel ${channelId}: ${missing.join(', ')}. ` +
        `Please initialize Chart of Accounts for this channel.`
      );
    }
  }

  /**
   * Post a payment entry (customer payment settlement)
   */
  async postPayment(
    ctx: RequestContext,
    sourceId: string,
    context: PaymentPostingContext
  ): Promise<void> {
    const template = createPaymentEntry(context);
    const accountCodes = template.lines.map(l => l.accountCode);
    
    await this.ensureAccountsExist(ctx.channelId as number, accountCodes);

    const payload: PostingPayload = {
      channelId: ctx.channelId as number,
      entryDate: new Date().toISOString().slice(0, 10),
      memo: template.memo,
      lines: template.lines,
    };

    await this.postingService.post('Payment', sourceId, payload);
    this.logger.log(`Posted payment entry for payment ${sourceId}, order ${context.orderCode}`);
  }

  /**
   * Post a credit sale entry (order fulfilled without payment)
   */
  async postCreditSale(
    ctx: RequestContext,
    sourceId: string,
    context: SalePostingContext
  ): Promise<void> {
    const template = createCreditSaleEntry(context);
    const accountCodes = template.lines.map(l => l.accountCode);
    
    await this.ensureAccountsExist(ctx.channelId as number, accountCodes);

    const payload: PostingPayload = {
      channelId: ctx.channelId as number,
      entryDate: new Date().toISOString().slice(0, 10),
      memo: template.memo,
      lines: template.lines,
    };

    await this.postingService.post('CreditSale', sourceId, payload);
    this.logger.log(`Posted credit sale entry for order ${context.orderCode}`);
  }

  /**
   * Post a payment allocation entry (customer paying off credit)
   */
  async postPaymentAllocation(
    ctx: RequestContext,
    sourceId: string,
    context: PaymentPostingContext
  ): Promise<void> {
    const template = createPaymentAllocationEntry(context);
    const accountCodes = template.lines.map(l => l.accountCode);
    
    await this.ensureAccountsExist(ctx.channelId as number, accountCodes);

    const payload: PostingPayload = {
      channelId: ctx.channelId as number,
      entryDate: new Date().toISOString().slice(0, 10),
      memo: template.memo,
      lines: template.lines,
    };

    await this.postingService.post('PaymentAllocation', sourceId, payload);
    this.logger.log(`Posted payment allocation entry for payment ${sourceId}, order ${context.orderCode}`);
  }

  /**
   * Post a supplier purchase entry (credit purchase)
   */
  async postSupplierPurchase(
    ctx: RequestContext,
    sourceId: string,
    context: PurchasePostingContext
  ): Promise<void> {
    const template = createSupplierPurchaseEntry(context);
    const accountCodes = template.lines.map(l => l.accountCode);
    
    await this.ensureAccountsExist(ctx.channelId as number, accountCodes);

    const payload: PostingPayload = {
      channelId: ctx.channelId as number,
      entryDate: new Date().toISOString().slice(0, 10),
      memo: template.memo,
      lines: template.lines,
    };

    await this.postingService.post('SupplierPurchase', sourceId, payload);
    this.logger.log(`Posted supplier purchase entry for purchase ${context.purchaseReference}`);
  }

  /**
   * Post a supplier payment entry
   */
  async postSupplierPayment(
    ctx: RequestContext,
    sourceId: string,
    context: SupplierPaymentPostingContext
  ): Promise<void> {
    const template = createSupplierPaymentEntry(context);
    const accountCodes = template.lines.map(l => l.accountCode);
    
    await this.ensureAccountsExist(ctx.channelId as number, accountCodes);

    const payload: PostingPayload = {
      channelId: ctx.channelId as number,
      entryDate: new Date().toISOString().slice(0, 10),
      memo: template.memo,
      lines: template.lines,
    };

    await this.postingService.post('SupplierPayment', sourceId, payload);
    this.logger.log(`Posted supplier payment entry for payment ${sourceId}, purchase ${context.purchaseReference}`);
  }

  /**
   * Post a refund entry
   */
  async postRefund(
    ctx: RequestContext,
    sourceId: string,
    context: RefundPostingContext
  ): Promise<void> {
    const template = createRefundEntry(context);
    const accountCodes = template.lines.map(l => l.accountCode);
    
    await this.ensureAccountsExist(ctx.channelId as number, accountCodes);

    const payload: PostingPayload = {
      channelId: ctx.channelId as number,
      entryDate: new Date().toISOString().slice(0, 10),
      memo: template.memo,
      lines: template.lines,
    };

    await this.postingService.post('Refund', sourceId, payload);
    this.logger.log(`Posted refund entry for refund ${sourceId}, order ${context.orderCode}`);
  }
}

