import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { PostingService } from '../../ledger/posting.service';
import { PaymentEventsAdapter } from '../../services/payments/payment-events.adapter';
import { Account } from '../../ledger/account.entity';
import { JournalEntry } from '../../ledger/journal-entry.entity';
import { JournalLine } from '../../ledger/journal-line.entity';
import { MoneyEvent } from '../../domain/money/money-event.entity';
import { CashierSession } from '../../domain/cashier/cashier-session.entity';
import { Reconciliation } from '../../domain/recon/reconciliation.entity';
import { PeriodLock } from '../../domain/period/period-lock.entity';

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [Account, JournalEntry, JournalLine, MoneyEvent, CashierSession, Reconciliation, PeriodLock],
  providers: [PostingService, PaymentEventsAdapter],
  exports: [PostingService],
})
export class LedgerPlugin {}


