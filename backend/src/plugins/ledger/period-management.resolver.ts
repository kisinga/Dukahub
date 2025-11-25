import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';
import { AccountingPeriod } from '../../domain/period/accounting-period.entity';
import { Reconciliation } from '../../domain/recon/reconciliation.entity';
import { JournalEntry } from '../../ledger/journal-entry.entity';
import { PeriodEndClosingService } from '../../services/financial/period-end-closing.service';
import { ReconciliationService } from '../../services/financial/reconciliation.service';
import { InventoryReconciliationService } from '../../services/financial/inventory-reconciliation.service';
import { PostingService } from '../../ledger/posting.service';
import { TransactionalConnection } from '@vendure/core';
import { Account } from '../../ledger/account.entity';
import { PeriodLockService } from '../../services/financial/period-lock.service';
import { CloseAccountingPeriodPermission, ManageReconciliationPermission } from './permissions';

@Resolver()
export class PeriodManagementResolver {
  constructor(
    private readonly periodEndClosingService: PeriodEndClosingService,
    private readonly reconciliationService: ReconciliationService,
    private readonly inventoryReconciliationService: InventoryReconciliationService,
    private readonly postingService: PostingService,
    private readonly connection: TransactionalConnection,
    private readonly periodLockService: PeriodLockService
  ) {}

  @Query()
  @Allow(Permission.ReadOrder) // TODO: Use custom permission
  async currentPeriodStatus(@Ctx() ctx: RequestContext, @Args('channelId') channelId: number) {
    return this.periodEndClosingService.getCurrentPeriodStatus(ctx, channelId);
  }

  @Query()
  @Allow(Permission.ReadOrder) // TODO: Use custom permission
  async periodReconciliationStatus(
    @Ctx() ctx: RequestContext,
    @Args('channelId') channelId: number,
    @Args('periodEndDate') periodEndDate: string
  ) {
    return this.reconciliationService.getReconciliationStatus(ctx, channelId, periodEndDate);
  }

  @Query()
  @Allow(Permission.ReadOrder) // TODO: Use custom permission
  async closedPeriods(
    @Ctx() ctx: RequestContext,
    @Args('channelId') channelId: number,
    @Args('limit', { nullable: true }) limit?: number,
    @Args('offset', { nullable: true }) offset?: number
  ): Promise<AccountingPeriod[]> {
    const periodRepo = this.connection.getRepository(ctx, AccountingPeriod);
    return periodRepo.find({
      where: {
        channelId,
        status: 'closed',
      },
      order: {
        endDate: 'DESC',
      },
      take: limit || 10,
      skip: offset || 0,
    });
  }

  @Query()
  @Allow(Permission.ReadOrder) // TODO: Use custom permission
  async inventoryValuation(
    @Ctx() ctx: RequestContext,
    @Args('channelId') channelId: number,
    @Args('asOfDate') asOfDate: string,
    @Args('stockLocationId', { nullable: true }) stockLocationId?: number
  ) {
    return this.inventoryReconciliationService.calculateInventoryValuation(
      ctx,
      channelId,
      asOfDate,
      stockLocationId
    );
  }

  @Mutation()
  @Allow(ManageReconciliationPermission.Permission)
  async createReconciliation(
    @Ctx() ctx: RequestContext,
    @Args('input') input: any
  ): Promise<Reconciliation> {
    return this.reconciliationService.createReconciliation(ctx, input);
  }

  @Mutation()
  @Allow(ManageReconciliationPermission.Permission)
  async verifyReconciliation(
    @Ctx() ctx: RequestContext,
    @Args('reconciliationId') reconciliationId: string
  ): Promise<Reconciliation> {
    return this.reconciliationService.verifyReconciliation(ctx, reconciliationId);
  }

  @Mutation()
  @Allow(CloseAccountingPeriodPermission.Permission)
  async closeAccountingPeriod(
    @Ctx() ctx: RequestContext,
    @Args('channelId') channelId: number,
    @Args('periodEndDate') periodEndDate: string
  ) {
    return this.periodEndClosingService.closeAccountingPeriod(ctx, channelId, periodEndDate);
  }

  @Mutation()
  @Allow(CloseAccountingPeriodPermission.Permission)
  async openAccountingPeriod(
    @Ctx() ctx: RequestContext,
    @Args('channelId') channelId: number,
    @Args('periodStartDate') periodStartDate: string
  ): Promise<AccountingPeriod> {
    return this.periodEndClosingService.openAccountingPeriod(ctx, channelId, periodStartDate);
  }

  @Mutation()
  @Allow(ManageReconciliationPermission.Permission)
  async createInventoryReconciliation(
    @Ctx() ctx: RequestContext,
    @Args('input') input: any
  ): Promise<Reconciliation> {
    return this.inventoryReconciliationService.createInventoryReconciliation(ctx, input);
  }

  @Mutation()
  @Allow(ManageReconciliationPermission.Permission)
  async createInterAccountTransfer(
    @Ctx() ctx: RequestContext,
    @Args('input') input: any
  ): Promise<JournalEntry> {
    const accountRepo = this.connection.getRepository(ctx, Account);

    // Validate period is open
    await this.periodLockService.validatePeriodIsOpen(ctx, input.channelId, input.entryDate);

    // Validate both accounts exist and are sub-accounts (have parentAccountId)
    const [fromAccount, toAccount] = await Promise.all([
      accountRepo.findOne({
        where: {
          channelId: input.channelId,
          code: input.fromAccountCode,
        },
      }),
      accountRepo.findOne({
        where: {
          channelId: input.channelId,
          code: input.toAccountCode,
        },
      }),
    ]);

    if (!fromAccount || !toAccount) {
      throw new Error(
        `One or both accounts not found: ${input.fromAccountCode}, ${input.toAccountCode}`
      );
    }

    if (!fromAccount.parentAccountId || !toAccount.parentAccountId) {
      throw new Error(
        `Both accounts must be sub-accounts (have parentAccountId). ` +
          `Inter-account transfers only allowed between payment method sub-accounts.`
      );
    }

    // Validate both accounts are under the same parent (CASH)
    if (fromAccount.parentAccountId !== toAccount.parentAccountId) {
      throw new Error(
        `Inter-account transfers only allowed between sub-accounts under the same parent account.`
      );
    }

    // Create adjusting journal entry
    const amount = BigInt(input.amount);
    return this.postingService.post(ctx, 'inter-account-transfer', `transfer-${Date.now()}`, {
      channelId: input.channelId,
      entryDate: input.entryDate,
      memo: input.memo || 'Inter-account transfer for reconciliation',
      lines: [
        {
          accountCode: input.fromAccountCode,
          debit: 0,
          credit: Number(amount),
        },
        {
          accountCode: input.toAccountCode,
          debit: Number(amount),
          credit: 0,
        },
      ],
    });
  }
}
