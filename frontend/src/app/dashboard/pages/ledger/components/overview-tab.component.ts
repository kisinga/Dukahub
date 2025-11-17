import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LedgerAccount, JournalEntry } from '../../../../core/services/ledger/ledger.service';

@Component({
  selector: 'app-overview-tab',
  imports: [CommonModule],
  templateUrl: './overview-tab.component.html',
  styleUrl: './overview-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewTabComponent {
  keyAccounts = input.required<LedgerAccount[]>();
  recentEntries = input.required<JournalEntry[]>();
  isLoading = input.required<boolean>();
  selectedAccount = input.required<LedgerAccount | null>();
  formatCurrency = input.required<(amount: number) => string>();
  formatDate = input.required<(date: string) => string>();
  getEntryTotalDebit = input.required<(entry: JournalEntry) => number>();
  getEntryTotalCredit = input.required<(entry: JournalEntry) => number>();

  accountSelect = output<LedgerAccount>();
  entryView = output<JournalEntry>();

  onAccountClick(account: LedgerAccount) {
    this.accountSelect.emit(account);
  }

  onEntryView(entry: JournalEntry) {
    this.entryView.emit(entry);
  }
}

