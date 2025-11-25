import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { VENDURE_COMPATIBILITY_VERSION } from '../../constants/vendure-version.constants';
import { PostingService } from '../../ledger/posting.service';
import { Account } from '../../ledger/account.entity';
import { JournalEntry } from '../../ledger/journal-entry.entity';
import { JournalLine } from '../../ledger/journal-line.entity';
import { MoneyEvent } from '../../domain/money/money-event.entity';
import { CashierSession } from '../../domain/cashier/cashier-session.entity';
import { Reconciliation } from '../../domain/recon/reconciliation.entity';
import { PeriodLock } from '../../domain/period/period-lock.entity';
import { AccountingPeriod } from '../../domain/period/accounting-period.entity';
import { PurchasePayment } from '../../services/stock/entities/purchase-payment.entity';
import { gql } from 'graphql-tag';
import { DASHBOARD_STATS_SCHEMA } from './dashboard-stats.schema';
import { DashboardStatsResolver } from './dashboard-stats.resolver';
import { LEDGER_VIEWER_SCHEMA } from './ledger-viewer.schema';
import { LedgerViewerResolver } from './ledger-viewer.resolver';
import { PERIOD_MANAGEMENT_SCHEMA } from './period-management.schema';
import { PeriodManagementResolver } from './period-management.resolver';
import { LedgerQueryService } from '../../services/financial/ledger-query.service';
import { AccountBalanceService } from '../../services/financial/account-balance.service';
import { PeriodLockService } from '../../services/financial/period-lock.service';
import { ReconciliationService } from '../../services/financial/reconciliation.service';
import { ReconciliationValidatorService } from '../../services/financial/reconciliation-validator.service';
import { InventoryReconciliationService } from '../../services/financial/inventory-reconciliation.service';
import { PeriodEndClosingService } from '../../services/financial/period-end-closing.service';
import { ManageReconciliationPermission, CloseAccountingPeriodPermission } from './permissions';

// Merge schemas
const COMBINED_SCHEMA = gql`
  ${DASHBOARD_STATS_SCHEMA}
  ${LEDGER_VIEWER_SCHEMA}
  ${PERIOD_MANAGEMENT_SCHEMA}
`;

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [
    Account,
    JournalEntry,
    JournalLine,
    MoneyEvent,
    CashierSession,
    Reconciliation,
    PeriodLock,
    AccountingPeriod,
    PurchasePayment,
  ],
  providers: [
    PostingService,
    DashboardStatsResolver,
    LedgerViewerResolver,
    PeriodManagementResolver,
    LedgerQueryService,
    AccountBalanceService,
    PeriodLockService,
    ReconciliationService,
    ReconciliationValidatorService,
    InventoryReconciliationService,
    PeriodEndClosingService,
  ],
  exports: [PostingService, AccountBalanceService],
  configuration: config => {
    // Register custom permissions
    config.authOptions.customPermissions = [
      ...(config.authOptions.customPermissions || []),
      ManageReconciliationPermission,
      CloseAccountingPeriodPermission,
    ];
    return config;
  },
  adminApiExtensions: {
    schema: COMBINED_SCHEMA,
    resolvers: [DashboardStatsResolver, LedgerViewerResolver, PeriodManagementResolver],
  },
  shopApiExtensions: {
    schema: COMBINED_SCHEMA,
    resolvers: [DashboardStatsResolver, LedgerViewerResolver, PeriodManagementResolver],
  },
  compatibility: VENDURE_COMPATIBILITY_VERSION,
})
export class LedgerPlugin {}
