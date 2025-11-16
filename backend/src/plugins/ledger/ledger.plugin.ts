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

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [Account, JournalEntry, JournalLine, MoneyEvent, CashierSession, Reconciliation, PeriodLock, PurchasePayment],
  providers: [PostingService],
  exports: [PostingService],
})
export class LedgerPlugin {}


