import { ReconciliationScope } from '../../domain/recon/reconciliation.entity';
import { AccountingPeriod } from '../../domain/period/accounting-period.entity';

/**
 * Period Status
 * Current period state and reconciliation status
 */
export type PeriodStatus = {
  currentPeriod: AccountingPeriod | null;
  isLocked: boolean;
  lockEndDate: string | null;
  canClose: boolean;
  missingReconciliations: ReconciliationScope[];
};

/**
 * Period End Close Result
 * Result of period end closing operation
 */
export type PeriodEndCloseResult = {
  success: boolean;
  period: AccountingPeriod;
  reconciliationSummary: ReconciliationSummary;
};

/**
 * Reconciliation Summary
 * Summary of reconciliations by scope for a period
 */
export type ReconciliationSummary = {
  periodEndDate: string;
  scopes: ScopeReconciliationStatus[];
};

/**
 * Validation Result
 * Result of reconciliation validation
 */
export type ValidationResult = {
  isValid: boolean;
  errors: string[];
  missingReconciliations: MissingReconciliation[];
};

/**
 * Missing Reconciliation
 * Details about a missing reconciliation
 */
export type MissingReconciliation = {
  scope: ReconciliationScope;
  scopeRefId: string;
  displayName?: string;
};

/**
 * Reconciliation Status
 * Status of reconciliations for a period by scope
 */
export type ReconciliationStatus = {
  periodEndDate: string;
  scopes: ScopeReconciliationStatus[];
};

/**
 * Scope Reconciliation Status
 * Status of reconciliation for a specific scope
 */
export type ScopeReconciliationStatus = {
  scope: ReconciliationScope;
  scopeRefId: string;
  status: 'draft' | 'verified' | 'missing';
  varianceAmount?: string;
  displayName?: string;
};

/**
 * Inventory Valuation
 * Inventory valuation snapshot at a point in time
 */
export type InventoryValuation = {
  channelId: number;
  stockLocationId?: number;
  asOfDate: string;
  totalValue: string; // in smallest currency unit
  batchCount: number;
  itemCount: number;
};

/**
 * Inventory Reconciliation Result
 * Result of inventory reconciliation calculation
 */
export type InventoryReconciliationResult = {
  channelId: number;
  stockLocationId?: number;
  periodEndDate: string;
  ledgerBalance: string; // INVENTORY account balance from ledger
  inventoryValuation: string; // Calculated from inventory_batch
  variance: string; // ledgerBalance - inventoryValuation
};
