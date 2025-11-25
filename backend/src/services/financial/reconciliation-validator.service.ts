import { Injectable } from '@nestjs/common';
import { Channel, PaymentMethod, RequestContext, TransactionalConnection } from '@vendure/core';
import { Reconciliation, ReconciliationScope } from '../../domain/recon/reconciliation.entity';
import { Account } from '../../ledger/account.entity';
import { mapPaymentMethodToAccount } from './payment-method-mapping.config';
import { MissingReconciliation, ValidationResult } from './period-management.types';

/**
 * Reconciliation Validator Service
 *
 * Validates reconciliation completeness across all required scopes.
 */
@Injectable()
export class ReconciliationValidatorService {
  constructor(private readonly connection: TransactionalConnection) {}

  /**
   * Validate all required scopes are reconciled for a period
   */
  async validatePeriodReconciliation(
    ctx: RequestContext,
    channelId: number,
    periodEndDate: string
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const missingReconciliations: MissingReconciliation[] = [];

    // Get required payment method accounts
    const paymentMethodAccounts = await this.getRequiredPaymentMethodAccounts(ctx, channelId);

    // Check each payment method account has verified reconciliation
    for (const account of paymentMethodAccounts) {
      const reconciliation = await this.findReconciliation(
        ctx,
        channelId,
        'method',
        account.code,
        periodEndDate
      );

      if (!reconciliation) {
        missingReconciliations.push({
          scope: 'method',
          scopeRefId: account.code,
          displayName: account.name,
        });
        errors.push(`Missing reconciliation for payment method: ${account.name} (${account.code})`);
      } else if (reconciliation.status !== 'verified') {
        errors.push(
          `Reconciliation for payment method ${account.name} (${account.code}) is not verified`
        );
      }
    }

    // TODO: Check inventory reconciliation (if required)
    // TODO: Check bank reconciliation (if required and configured)
    // TODO: Check cash-session reconciliation (if required and configured)

    return {
      isValid: errors.length === 0,
      errors,
      missingReconciliations,
    };
  }

  /**
   * Get required scopes for reconciliation
   */
  async getRequiredScopesForReconciliation(
    ctx: RequestContext,
    channelId: number
  ): Promise<ReconciliationScope[]> {
    const scopes: ReconciliationScope[] = ['method']; // Always required

    // TODO: Add inventory, bank, cash-session based on configuration

    return scopes;
  }

  /**
   * Get required payment method accounts that need reconciliation
   * Returns sub-accounts (accounts with parentAccountId set)
   */
  async getRequiredPaymentMethodAccounts(
    ctx: RequestContext,
    channelId: number
  ): Promise<Account[]> {
    const accountRepo = this.connection.getRepository(ctx, Account);
    const channelRepo = this.connection.getRepository(ctx, Channel);

    // Get channel with payment methods
    const channel = await channelRepo.findOne({
      where: { id: channelId },
      relations: ['paymentMethods'],
    });

    if (!channel || !channel.paymentMethods) {
      return [];
    }

    // Get active payment methods
    const activePaymentMethods = channel.paymentMethods.filter(pm => pm.enabled);

    // Map each payment method to its ledger account
    const accountCodes = new Set<string>();
    for (const paymentMethod of activePaymentMethods) {
      // Extract handler code from payment method code (e.g., 'cash-1' -> 'cash')
      const handlerCode = paymentMethod.code.split('-')[0];
      const accountCode = mapPaymentMethodToAccount(handlerCode);
      accountCodes.add(accountCode);
    }

    // Get accounts that are sub-accounts (have parentAccountId set)
    const accounts = await accountRepo
      .createQueryBuilder('account')
      .where('account.channelId = :channelId', { channelId })
      .andWhere('account.code IN (:...codes)', { codes: Array.from(accountCodes) })
      .andWhere('account.parentAccountId IS NOT NULL')
      .getMany();

    return accounts;
  }

  /**
   * Find reconciliation for a scope and scopeRefId
   */
  private async findReconciliation(
    ctx: RequestContext,
    channelId: number,
    scope: ReconciliationScope,
    scopeRefId: string,
    periodEndDate: string
  ): Promise<Reconciliation | null> {
    const reconciliationRepo = this.connection.getRepository(ctx, Reconciliation);

    // Find reconciliation where periodEndDate falls within rangeStart and rangeEnd
    return reconciliationRepo
      .createQueryBuilder('reconciliation')
      .where('reconciliation.channelId = :channelId', { channelId })
      .andWhere('reconciliation.scope = :scope', { scope })
      .andWhere('reconciliation.scopeRefId = :scopeRefId', { scopeRefId })
      .andWhere('reconciliation.rangeStart <= :periodEndDate', { periodEndDate })
      .andWhere('reconciliation.rangeEnd >= :periodEndDate', { periodEndDate })
      .getOne();
  }
}
