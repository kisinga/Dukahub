import { Injectable, Logger } from '@nestjs/common';
import { RequestContext, TransactionalConnection } from '@vendure/core';
import { CashierSession } from '../../domain/cashier/cashier-session.entity';
import { Reconciliation } from '../../domain/recon/reconciliation.entity';
import { LedgerQueryService } from './ledger-query.service';
import { ReconciliationService, CreateReconciliationInput } from './reconciliation.service';
import { ACCOUNT_CODES } from '../../ledger/account-codes.constants';

/**
 * Cashier Session Summary
 * Financial summary for a cashier session from ledger
 */
export interface CashierSessionSummary {
  sessionId: string;
  cashierUserId: number;
  openedAt: Date;
  closedAt?: Date | null;
  status: 'open' | 'closed';
  openingFloat: number;
  closingDeclared: number;
  ledgerTotals: {
    cashTotal: number;
    mpesaTotal: number;
    totalCollected: number;
  };
  variance: number; // closingDeclared - (openingFloat + ledgerTotals.cashTotal)
}

/**
 * Close Session Input
 */
export interface CloseSessionInput {
  sessionId: string;
  closingDeclared: number; // Amount declared by cashier (in cents)
  notes?: string;
}

/**
 * Open Session Input
 */
export interface OpenSessionInput {
  channelId: number;
  openingFloat: number; // Starting cash float (in cents)
}

/**
 * Cashier Session Service
 *
 * Manages cashier sessions and provides ledger-integrated reconciliation.
 * Composes existing infrastructure (LedgerQueryService, ReconciliationService)
 * to enable session-scoped financial tracking.
 *
 * IMPORTANT: All financial figures come from the ledger as the single source of truth.
 */
@Injectable()
export class CashierSessionService {
  private readonly logger = new Logger(CashierSessionService.name);

  constructor(
    private readonly connection: TransactionalConnection,
    private readonly ledgerQueryService: LedgerQueryService,
    private readonly reconciliationService: ReconciliationService
  ) {}

  /**
   * Start a new cashier session
   */
  async startSession(ctx: RequestContext, input: OpenSessionInput): Promise<CashierSession> {
    const sessionRepo = this.connection.getRepository(ctx, CashierSession);

    // Check for existing open session for this channel
    const existingOpenSession = await sessionRepo.findOne({
      where: {
        channelId: input.channelId,
        status: 'open',
      },
    });

    if (existingOpenSession) {
      throw new Error(
        `Channel ${input.channelId} already has an open cashier session. ` +
          `Please close session ${existingOpenSession.id} before opening a new one.`
      );
    }

    const cashierUserId = ctx.activeUserId ? parseInt(ctx.activeUserId.toString(), 10) : 0;

    const session = sessionRepo.create({
      channelId: input.channelId,
      cashierUserId,
      openedAt: new Date(),
      openingFloat: input.openingFloat.toString(),
      closingDeclared: '0',
      status: 'open',
    });

    const savedSession = await sessionRepo.save(session);
    this.logger.log(
      `Cashier session ${savedSession.id} started for channel ${input.channelId} ` +
        `by user ${cashierUserId} with opening float ${input.openingFloat}`
    );

    return savedSession;
  }

  /**
   * Close a cashier session and calculate variance
   */
  async closeSession(ctx: RequestContext, input: CloseSessionInput): Promise<CashierSessionSummary> {
    const sessionRepo = this.connection.getRepository(ctx, CashierSession);

    const session = await sessionRepo.findOne({
      where: { id: input.sessionId },
    });

    if (!session) {
      throw new Error(`Cashier session ${input.sessionId} not found`);
    }

    if (session.status === 'closed') {
      throw new Error(`Cashier session ${input.sessionId} is already closed`);
    }

    // Get ledger totals for this session
    const ledgerTotals = await this.ledgerQueryService.getCashierSessionTotals(
      session.channelId,
      session.id
    );

    // Update session
    session.closedAt = new Date();
    session.closingDeclared = input.closingDeclared.toString();
    session.status = 'closed';

    await sessionRepo.save(session);

    // Calculate variance
    const openingFloat = parseInt(session.openingFloat, 10);
    const expectedCash = openingFloat + ledgerTotals.cashTotal;
    const variance = input.closingDeclared - expectedCash;

    this.logger.log(
      `Cashier session ${session.id} closed. ` +
        `Expected: ${expectedCash}, Declared: ${input.closingDeclared}, Variance: ${variance}`
    );

    return {
      sessionId: session.id,
      cashierUserId: session.cashierUserId,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      status: session.status,
      openingFloat,
      closingDeclared: input.closingDeclared,
      ledgerTotals,
      variance,
    };
  }

  /**
   * Get summary for a cashier session (can be open or closed)
   */
  async getSessionSummary(ctx: RequestContext, sessionId: string): Promise<CashierSessionSummary> {
    const sessionRepo = this.connection.getRepository(ctx, CashierSession);

    const session = await sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error(`Cashier session ${sessionId} not found`);
    }

    // Get ledger totals for this session
    const ledgerTotals = await this.ledgerQueryService.getCashierSessionTotals(
      session.channelId,
      session.id
    );

    const openingFloat = parseInt(session.openingFloat, 10);
    const closingDeclared = parseInt(session.closingDeclared, 10);
    const expectedCash = openingFloat + ledgerTotals.cashTotal;
    const variance = session.status === 'closed' ? closingDeclared - expectedCash : 0;

    return {
      sessionId: session.id,
      cashierUserId: session.cashierUserId,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      status: session.status,
      openingFloat,
      closingDeclared,
      ledgerTotals,
      variance,
    };
  }

  /**
   * Get current open session for a channel (if any)
   */
  async getCurrentSession(ctx: RequestContext, channelId: number): Promise<CashierSession | null> {
    const sessionRepo = this.connection.getRepository(ctx, CashierSession);

    return sessionRepo.findOne({
      where: {
        channelId,
        status: 'open',
      },
    });
  }

  /**
   * Get sessions for a channel with optional filters
   */
  async getSessions(
    ctx: RequestContext,
    channelId: number,
    options?: {
      status?: 'open' | 'closed';
      startDate?: string;
      endDate?: string;
      take?: number;
      skip?: number;
    }
  ): Promise<{ items: CashierSession[]; totalItems: number }> {
    const sessionRepo = this.connection.getRepository(ctx, CashierSession);

    let queryBuilder = sessionRepo
      .createQueryBuilder('session')
      .where('session.channelId = :channelId', { channelId });

    if (options?.status) {
      queryBuilder = queryBuilder.andWhere('session.status = :status', { status: options.status });
    }

    if (options?.startDate) {
      queryBuilder = queryBuilder.andWhere('session.openedAt >= :startDate', {
        startDate: options.startDate,
      });
    }

    if (options?.endDate) {
      queryBuilder = queryBuilder.andWhere('session.openedAt <= :endDate', {
        endDate: options.endDate,
      });
    }

    const totalItems = await queryBuilder.getCount();

    queryBuilder = queryBuilder.orderBy('session.openedAt', 'DESC');

    if (options?.take) {
      queryBuilder = queryBuilder.take(options.take);
    }

    if (options?.skip) {
      queryBuilder = queryBuilder.skip(options.skip);
    }

    const items = await queryBuilder.getMany();

    return { items, totalItems };
  }

  /**
   * Create reconciliation record for a closed session
   */
  async createSessionReconciliation(
    ctx: RequestContext,
    sessionId: string,
    notes?: string
  ): Promise<Reconciliation> {
    const summary = await this.getSessionSummary(ctx, sessionId);

    if (summary.status !== 'closed') {
      throw new Error(`Cannot create reconciliation for open session ${sessionId}. Close the session first.`);
    }

    // Expected balance = opening float + cash collected from ledger
    const expectedBalance = summary.openingFloat + summary.ledgerTotals.cashTotal;

    const input: CreateReconciliationInput = {
      channelId: await this.getSessionChannelId(ctx, sessionId),
      scope: 'cash-session',
      scopeRefId: sessionId,
      rangeStart: summary.openedAt.toISOString().slice(0, 10),
      rangeEnd: (summary.closedAt || new Date()).toISOString().slice(0, 10),
      expectedBalance: expectedBalance.toString(),
      actualBalance: summary.closingDeclared.toString(),
      notes: notes || `Cashier session reconciliation for session ${sessionId}`,
    };

    return this.reconciliationService.createReconciliation(ctx, input);
  }

  /**
   * Get channel ID for a session
   */
  private async getSessionChannelId(ctx: RequestContext, sessionId: string): Promise<number> {
    const sessionRepo = this.connection.getRepository(ctx, CashierSession);
    const session = await sessionRepo.findOne({
      where: { id: sessionId },
      select: ['channelId'],
    });

    if (!session) {
      throw new Error(`Cashier session ${sessionId} not found`);
    }

    return session.channelId;
  }
}


