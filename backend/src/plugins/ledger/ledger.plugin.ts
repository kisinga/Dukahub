import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { PostingService } from '../../ledger/posting.service';
import { Account } from '../../ledger/account.entity';
import { JournalEntry } from '../../ledger/journal-entry.entity';
import { JournalLine } from '../../ledger/journal-line.entity';
import { MoneyEvent } from '../../domain/money/money-event.entity';
import { CashierSession } from '../../domain/cashier/cashier-session.entity';
import { Reconciliation } from '../../domain/recon/reconciliation.entity';
import { PeriodLock } from '../../domain/period/period-lock.entity';
import { PurchasePayment } from '../../services/stock/entities/purchase-payment.entity';
import { DASHBOARD_STATS_SCHEMA } from './dashboard-stats.schema';
import { DashboardStatsResolver } from './dashboard-stats.resolver';
import { LedgerQueryService } from '../../services/financial/ledger-query.service';

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [Account, JournalEntry, JournalLine, MoneyEvent, CashierSession, Reconciliation, PeriodLock, PurchasePayment],
  providers: [PostingService, DashboardStatsResolver, LedgerQueryService],
  exports: [PostingService],
  adminApiExtensions: {
    schema: DASHBOARD_STATS_SCHEMA,
    resolvers: [DashboardStatsResolver],
  },
  shopApiExtensions: {
    schema: DASHBOARD_STATS_SCHEMA,
    resolvers: [DashboardStatsResolver],
  },
})
export class LedgerPlugin {}


