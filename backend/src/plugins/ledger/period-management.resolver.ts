import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';
import { AccountingPeriod } from '../../domain/period/accounting-period.entity';
import { Reconciliation } from '../../domain/recon/reconciliation.entity';
import { CashierSession } from '../../domain/cashier/cashier-session.entity';
import { JournalEntry } from '../../ledger/journal-entry.entity';
import { PeriodEndClosingService } from '../../services/financial/period-end-closing.service';
import { ReconciliationService } from '../../services/financial/reconciliation.service';
import { InventoryReconciliationService } from '../../services/financial/inventory-reconciliation.service';
import { CashierSessionService, CashierSessionSummary } from '../../services/financial/cashier-session.service';
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
    private readonly cashierSessionService: CashierSessionService,
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

  // ============================================================================
  // CASHIER SESSION QUERIES
  // ============================================================================

  @Query()
  @Allow(Permission.ReadOrder)
  async currentCashierSession(
    @Ctx() ctx: RequestContext,
    @Args('channelId') channelId: number
  ): Promise<CashierSession | null> {
    return this.cashierSessionService.getCurrentSession(ctx, channelId);
  }

  @Query()
  @Allow(Permission.ReadOrder)
  async cashierSession(
    @Ctx() ctx: RequestContext,
    @Args('sessionId') sessionId: string
  ) {
    const summary = await this.cashierSessionService.getSessionSummary(ctx, sessionId);
    return this.formatSessionSummaryForGraphQL(summary);
  }

  @Query()
  @Allow(Permission.ReadOrder)
  async cashierSessions(
    @Ctx() ctx: RequestContext,
    @Args('channelId') channelId: number,
    @Args('options', { nullable: true }) options?: any
  ) {
    return this.cashierSessionService.getSessions(ctx, channelId, {
      status: options?.status,
      startDate: options?.startDate,
      endDate: options?.endDate,
      take: options?.take,
      skip: options?.skip,
    });
  }

  // ============================================================================
  // CASHIER SESSION MUTATIONS
  // ============================================================================

  @Mutation()
  @Allow(ManageReconciliationPermission.Permission)
  async openCashierSession(
    @Ctx() ctx: RequestContext,
    @Args('input') input: any
  ): Promise<CashierSession> {
    return this.cashierSessionService.startSession(ctx, {
      channelId: input.channelId,
      openingFloat: parseInt(input.openingFloat, 10),
    });
  }

  @Mutation()
  @Allow(ManageReconciliationPermission.Permission)
  async closeCashierSession(
    @Ctx() ctx: RequestContext,
    @Args('input') input: any
  ) {
    const summary = await this.cashierSessionService.closeSession(ctx, {
      sessionId: input.sessionId,
      closingDeclared: parseInt(input.closingDeclared, 10),
      notes: input.notes,
    });
    return this.formatSessionSummaryForGraphQL(summary);
  }

  @Mutation()
  @Allow(ManageReconciliationPermission.Permission)
  async createCashierSessionReconciliation(
    @Ctx() ctx: RequestContext,
    @Args('sessionId') sessionId: string,
    @Args('notes', { nullable: true }) notes?: string
  ): Promise<Reconciliation> {
    return this.cashierSessionService.createSessionReconciliation(ctx, sessionId, notes);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Format session summary for GraphQL response
   * Converts numeric values to strings for BigInt compatibility
   */
  private formatSessionSummaryForGraphQL(summary: CashierSessionSummary) {
    return {
      sessionId: summary.sessionId,
      cashierUserId: summary.cashierUserId,
      openedAt: summary.openedAt,
      closedAt: summary.closedAt,
      status: summary.status,
      openingFloat: summary.openingFloat.toString(),
      closingDeclared: summary.closingDeclared.toString(),
      ledgerTotals: {
        cashTotal: summary.ledgerTotals.cashTotal.toString(),
        mpesaTotal: summary.ledgerTotals.mpesaTotal.toString(),
        totalCollected: summary.ledgerTotals.totalCollected.toString(),
      },
      variance: summary.variance.toString(),
    };
  }
}
