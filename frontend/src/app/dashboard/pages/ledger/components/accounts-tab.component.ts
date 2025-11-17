import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LedgerAccount } from '../../../../core/services/ledger/ledger.service';

export interface AccountsByType {
  [key: string]: LedgerAccount[];
}

@Component({
  selector: 'app-accounts-tab',
  imports: [CommonModule],
  templateUrl: './accounts-tab.component.html',
  styleUrl: './accounts-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountsTabComponent {
  accountsByType = input.required<AccountsByType>();
  selectedAccount = input.required<LedgerAccount | null>();
  formatCurrency = input.required<(amount: number) => string>();
  getAccountTypeLabel = input.required<(type: string) => string>();
  getAccountTypeTotal = input.required<(type: string) => number>();

  accountSelect = output<LedgerAccount>();
  viewTransactions = output<LedgerAccount>();

  readonly accountTypes = ['asset', 'liability', 'equity', 'income', 'expense'] as const;

  onAccountClick(account: LedgerAccount) {
    this.accountSelect.emit(account);
  }

  onViewTransactions(account: LedgerAccount, event: Event) {
    event.stopPropagation();
    this.viewTransactions.emit(account);
  }
}

