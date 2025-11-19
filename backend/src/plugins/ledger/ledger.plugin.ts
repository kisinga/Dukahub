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
import { PurchasePayment } from '../../services/stock/entities/purchase-payment.entity';
import { gql } from 'graphql-tag';
import { DASHBOARD_STATS_SCHEMA } from './dashboard-stats.schema';
import { DashboardStatsResolver } from './dashboard-stats.resolver';
import { LEDGER_VIEWER_SCHEMA } from './ledger-viewer.schema';
import { LedgerViewerResolver } from './ledger-viewer.resolver';
import { LedgerQueryService } from '../../services/financial/ledger-query.service';

// Merge schemas
const COMBINED_SCHEMA = gql`
  ${DASHBOARD_STATS_SCHEMA}
  ${LEDGER_VIEWER_SCHEMA}
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
    PurchasePayment,
  ],
  providers: [PostingService, DashboardStatsResolver, LedgerViewerResolver, LedgerQueryService],
  exports: [PostingService],
  adminApiExtensions: {
    schema: COMBINED_SCHEMA,
    resolvers: [DashboardStatsResolver, LedgerViewerResolver],
  },
  shopApiExtensions: {
    schema: COMBINED_SCHEMA,
    resolvers: [DashboardStatsResolver, LedgerViewerResolver],
  },
  compatibility: VENDURE_COMPATIBILITY_VERSION,
})
export class LedgerPlugin {}
