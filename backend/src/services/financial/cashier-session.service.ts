import { Injectable, Logger } from '@nestjs/common';
import { Channel, PaymentMethod, RequestContext, TransactionalConnection } from '@vendure/core';
import { CashDrawerCount, CashCountType } from '../../domain/cashier/cash-drawer-count.entity';
import { CashierSession } from '../../domain/cashier/cashier-session.entity';
import { MpesaVerification } from '../../domain/cashier/mpesa-verification.entity';
import { Reconciliation } from '../../domain/recon/reconciliation.entity';
import { LedgerQueryService } from './ledger-query.service';
import {
  getAccountCodeFromPaymentMethod,
  getReconciliationTypeFromPaymentMethod,
  isCashierControlledPaymentMethod,
  requiresReconciliation,
} from './payment-method-mapping.config';
import { CreateReconciliationInput, ReconciliationService } from './reconciliation.service';

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
 * Record Cash Count Input (Blind Count)
 */
export interface RecordCashCountInput {
  sessionId: string;
  declaredCash: number; // Amount cashier counted (in cents)
  countType: CashCountType;
}

/**
 * Cash Count Result
 * Returned to cashier after blind count - variance details hidden
 */
export interface CashCountResult {
  count: CashDrawerCount;
  hasVariance: boolean; // Tells cashier there's a difference without revealing amount
  varianceHidden: boolean; // True if cashier can't see the variance
}

/**
 * Verify M-Pesa Input
 */
export interface VerifyMpesaInput {
  sessionId: string;
  allConfirmed: boolean;
  flaggedTransactionIds?: string[];
  notes?: string;
}

/**
 * Payment method reconciliation config for a session
 */
export interface PaymentMethodReconciliationConfig {
  paymentMethodId: string;
  paymentMethodCode: string;
  reconciliationType: 'blind_count' | 'transaction_verification' | 'statement_match' | 'none';
  ledgerAccountCode: string;
  isCashierControlled: boolean;
  requiresReconciliation: boolean;
}

/**
 * Session reconciliation requirements
 * Derived from payment method configuration
 */
export interface SessionReconciliationRequirements {
  blindCountRequired: boolean;
  verificationRequired: boolean;
  paymentMethods: PaymentMethodReconciliationConfig[];
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
   * If requireOpeningCount is enabled, creates an opening cash count
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

    // Check if opening count is required
    const requireOpeningCount = await this.isOpeningCountRequired(ctx, input.channelId);
    if (requireOpeningCount) {
      // Create opening cash count - this records the opening float as a verified count
      await this.recordCashCount(ctx, {
        sessionId: savedSession.id,
        declaredCash: input.openingFloat,
        countType: 'opening',
      });
    }

    this.logger.log(
      `Cashier session ${savedSession.id} started for channel ${input.channelId} ` +
        `by user ${cashierUserId} with opening float ${input.openingFloat}`
    );

    return savedSession;
  }

  /**
   * Check if opening count is required for a channel
   */
  private async isOpeningCountRequired(ctx: RequestContext, channelId: number): Promise<boolean> {
    const channelRepo = this.connection.getRepository(ctx, Channel);
    const channel = await channelRepo.findOne({
      where: { id: channelId },
    });

    if (!channel) {
      return true; // Default to required
    }

    return (channel as any).customFields?.requireOpeningCount ?? true;
  }

  /**
   * Close a cashier session and calculate variance
   * Automatically creates a closing cash count record
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

    // Create a closing cash count (blind count)
    const closingCount = await this.recordCashCount(ctx, {
      sessionId: input.sessionId,
      declaredCash: input.closingDeclared,
      countType: 'closing',
    });

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
        `Expected: ${expectedCash}, Declared: ${input.closingDeclared}, Variance: ${variance}, ` +
        `ClosingCountId: ${closingCount.count.id}`
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

  // ============================================================================
  // CASH CONTROL METHODS
  // ============================================================================

  /**
   * Record a blind cash count
   * Cashier declares their count WITHOUT seeing the expected amount.
   * System calculates variance internally but hides it from cashier.
   */
  async recordCashCount(
    ctx: RequestContext,
    input: RecordCashCountInput
  ): Promise<CashCountResult> {
    const sessionRepo = this.connection.getRepository(ctx, CashierSession);
    const countRepo = this.connection.getRepository(ctx, CashDrawerCount);

    const session = await sessionRepo.findOne({
      where: { id: input.sessionId },
    });

    if (!session) {
      throw new Error(`Cashier session ${input.sessionId} not found`);
    }

    // Calculate expected cash from ledger
    const expectedCash = await this.calculateExpectedCash(ctx, session);

    // Calculate variance
    const variance = input.declaredCash - expectedCash;

    const countedByUserId = ctx.activeUserId ? parseInt(ctx.activeUserId.toString(), 10) : 0;

    const count = countRepo.create({
      channelId: session.channelId,
      sessionId: session.id,
      countType: input.countType,
      takenAt: new Date(),
      declaredCash: input.declaredCash.toString(),
      expectedCash: expectedCash.toString(),
      variance: variance.toString(),
      countedByUserId,
    });

    const savedCount = await countRepo.save(count);

    const hasVariance = Math.abs(variance) > 0;

    this.logger.log(
      `Cash count recorded for session ${session.id}. ` +
        `Type: ${input.countType}, Declared: ${input.declaredCash}, ` +
        `Expected: ${expectedCash}, Variance: ${variance}`
    );

    // Check if we should notify managers about variance
    if (hasVariance) {
      const threshold = await this.getVarianceNotificationThreshold(ctx, session.channelId);
      if (Math.abs(variance) >= threshold) {
        // TODO: Trigger notification to managers
        this.logger.warn(
          `Cash variance detected for session ${session.id}: ${variance} cents ` +
            `(threshold: ${threshold})`
        );
      }
    }

    return {
      count: savedCount,
      hasVariance,
      varianceHidden: true, // Always hidden for cashiers
    };
  }

  /**
   * Calculate expected cash for a session
   * Internal method - not exposed to cashiers
   */
  private async calculateExpectedCash(
    ctx: RequestContext,
    session: CashierSession
  ): Promise<number> {
    const openingFloat = parseInt(session.openingFloat, 10);

    // Get cash collected during session from ledger
    const ledgerTotals = await this.ledgerQueryService.getCashierSessionTotals(
      session.channelId,
      session.id
    );

    // Expected = opening float + cash sales
    // Note: M-Pesa goes directly to till, not cashier's control
    return openingFloat + ledgerTotals.cashTotal;
  }

  /**
   * Get variance notification threshold for a channel
   */
  private async getVarianceNotificationThreshold(
    ctx: RequestContext,
    channelId: number
  ): Promise<number> {
    const channelRepo = this.connection.getRepository(ctx, Channel);
    const channel = await channelRepo.findOne({
      where: { id: channelId },
    });

    if (!channel) {
      return 100; // Default 1 KES
    }

    return (channel as any).customFields?.varianceNotificationThreshold ?? 100;
  }

  /**
   * Manager reviews a cash count - reveals full variance details
   */
  async reviewCashCount(
    ctx: RequestContext,
    countId: string,
    notes?: string
  ): Promise<CashDrawerCount> {
    const countRepo = this.connection.getRepository(ctx, CashDrawerCount);

    const count = await countRepo.findOne({
      where: { id: countId },
    });

    if (!count) {
      throw new Error(`Cash count ${countId} not found`);
    }

    if (count.reviewedByUserId) {
      this.logger.debug(`Cash count ${countId} already reviewed`);
      return count;
    }

    const reviewedByUserId = ctx.activeUserId ? parseInt(ctx.activeUserId.toString(), 10) : null;

    count.reviewedByUserId = reviewedByUserId;
    count.reviewedAt = new Date();
    count.reviewNotes = notes || null;

    const savedCount = await countRepo.save(count);

    this.logger.log(
      `Cash count ${countId} reviewed by user ${reviewedByUserId}. ` +
        `Variance: ${count.variance}`
    );

    return savedCount;
  }

  /**
   * Cashier explains a variance
   */
  async explainVariance(
    ctx: RequestContext,
    countId: string,
    reason: string
  ): Promise<CashDrawerCount> {
    const countRepo = this.connection.getRepository(ctx, CashDrawerCount);

    const count = await countRepo.findOne({
      where: { id: countId },
    });

    if (!count) {
      throw new Error(`Cash count ${countId} not found`);
    }

    count.varianceReason = reason;

    const savedCount = await countRepo.save(count);

    this.logger.log(
      `Variance explanation added for count ${countId}: "${reason}"`
    );

    return savedCount;
  }

  /**
   * Get all cash counts for a session
   */
  async getSessionCashCounts(
    ctx: RequestContext,
    sessionId: string
  ): Promise<CashDrawerCount[]> {
    const countRepo = this.connection.getRepository(ctx, CashDrawerCount);

    return countRepo.find({
      where: { sessionId },
      order: { takenAt: 'ASC' },
    });
  }

  /**
   * Get pending variance reviews for a channel
   * Returns counts with variance that haven't been reviewed
   */
  async getPendingVarianceReviews(
    ctx: RequestContext,
    channelId: number
  ): Promise<CashDrawerCount[]> {
    const countRepo = this.connection.getRepository(ctx, CashDrawerCount);

    return countRepo
      .createQueryBuilder('count')
      .where('count.channelId = :channelId', { channelId })
      .andWhere('count.variance != :zero', { zero: '0' })
      .andWhere('count.reviewedByUserId IS NULL')
      .orderBy('count.takenAt', 'DESC')
      .getMany();
  }

  /**
   * Verify M-Pesa transactions for a session
   * Cashier confirms all M-Pesa payments were received at the till
   */
  async verifyMpesaTransactions(
    ctx: RequestContext,
    input: VerifyMpesaInput
  ): Promise<MpesaVerification> {
    const sessionRepo = this.connection.getRepository(ctx, CashierSession);
    const verificationRepo = this.connection.getRepository(ctx, MpesaVerification);

    const session = await sessionRepo.findOne({
      where: { id: input.sessionId },
    });

    if (!session) {
      throw new Error(`Cashier session ${input.sessionId} not found`);
    }

    // Get M-Pesa transaction count from ledger
    const ledgerTotals = await this.ledgerQueryService.getCashierSessionTotals(
      session.channelId,
      session.id
    );

    // For now, we estimate transaction count from the total
    // In a real implementation, you'd query individual M-Pesa transactions
    const transactionCount = ledgerTotals.mpesaTotal > 0 ? 1 : 0; // Placeholder

    const verifiedByUserId = ctx.activeUserId ? parseInt(ctx.activeUserId.toString(), 10) : 0;

    const verification = verificationRepo.create({
      channelId: session.channelId,
      sessionId: session.id,
      verifiedAt: new Date(),
      transactionCount,
      allConfirmed: input.allConfirmed,
      flaggedTransactionIds: input.flaggedTransactionIds
        ? JSON.stringify(input.flaggedTransactionIds)
        : null,
      notes: input.notes || null,
      verifiedByUserId,
    });

    const savedVerification = await verificationRepo.save(verification);

    this.logger.log(
      `M-Pesa verification recorded for session ${session.id}. ` +
        `All confirmed: ${input.allConfirmed}, Flagged: ${input.flaggedTransactionIds?.length || 0}`
    );

    return savedVerification;
  }

  /**
   * Get M-Pesa verifications for a session
   */
  async getSessionMpesaVerifications(
    ctx: RequestContext,
    sessionId: string
  ): Promise<MpesaVerification[]> {
    const verificationRepo = this.connection.getRepository(ctx, MpesaVerification);

    return verificationRepo.find({
      where: { sessionId },
      order: { verifiedAt: 'DESC' },
    });
  }

  // ============================================================================
  // RECONCILIATION REQUIREMENTS (Driven by Payment Method Configuration)
  // ============================================================================

  /**
   * Get reconciliation requirements for a session based on payment method config
   * Queries payment methods to determine what reconciliation is needed at close
   */
  async getSessionReconciliationRequirements(
    ctx: RequestContext,
    sessionId: string
  ): Promise<SessionReconciliationRequirements> {
    const sessionRepo = this.connection.getRepository(ctx, CashierSession);

    const session = await sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error(`Cashier session ${sessionId} not found`);
    }

    const paymentMethods = await this.getChannelPaymentMethods(ctx, session.channelId);

    // Filter to enabled, cashier-controlled payment methods
    const cashierControlled = paymentMethods.filter(
      pm => pm.enabled && isCashierControlledPaymentMethod(pm)
    );

    // Map to reconciliation config
    const paymentMethodConfigs: PaymentMethodReconciliationConfig[] = cashierControlled.map(pm => ({
      paymentMethodId: pm.id.toString(),
      paymentMethodCode: pm.code,
      reconciliationType: getReconciliationTypeFromPaymentMethod(pm),
      ledgerAccountCode: getAccountCodeFromPaymentMethod(pm),
      isCashierControlled: isCashierControlledPaymentMethod(pm),
      requiresReconciliation: requiresReconciliation(pm),
    }));

    return {
      blindCountRequired: paymentMethodConfigs.some(
        pm => pm.reconciliationType === 'blind_count'
      ),
      verificationRequired: paymentMethodConfigs.some(
        pm => pm.reconciliationType === 'transaction_verification'
      ),
      paymentMethods: paymentMethodConfigs,
    };
  }

  /**
   * Get reconciliation requirements for a channel (not session-specific)
   */
  async getChannelReconciliationRequirements(
    ctx: RequestContext,
    channelId: number
  ): Promise<SessionReconciliationRequirements> {
    const paymentMethods = await this.getChannelPaymentMethods(ctx, channelId);

    // Filter to enabled, cashier-controlled payment methods
    const cashierControlled = paymentMethods.filter(
      pm => pm.enabled && isCashierControlledPaymentMethod(pm)
    );

    // Map to reconciliation config
    const paymentMethodConfigs: PaymentMethodReconciliationConfig[] = cashierControlled.map(pm => ({
      paymentMethodId: pm.id.toString(),
      paymentMethodCode: pm.code,
      reconciliationType: getReconciliationTypeFromPaymentMethod(pm),
      ledgerAccountCode: getAccountCodeFromPaymentMethod(pm),
      isCashierControlled: isCashierControlledPaymentMethod(pm),
      requiresReconciliation: requiresReconciliation(pm),
    }));

    return {
      blindCountRequired: paymentMethodConfigs.some(
        pm => pm.reconciliationType === 'blind_count'
      ),
      verificationRequired: paymentMethodConfigs.some(
        pm => pm.reconciliationType === 'transaction_verification'
      ),
      paymentMethods: paymentMethodConfigs,
    };
  }

  /**
   * Get all payment methods for a channel
   */
  private async getChannelPaymentMethods(
    ctx: RequestContext,
    channelId: number
  ): Promise<PaymentMethod[]> {
    const channelRepo = this.connection.getRepository(ctx, Channel);
    const channel = await channelRepo.findOne({
      where: { id: channelId },
      relations: ['paymentMethods'],
    });

    return channel?.paymentMethods || [];
  }
}


