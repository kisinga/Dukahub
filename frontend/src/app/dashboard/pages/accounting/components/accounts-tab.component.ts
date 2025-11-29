import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LedgerAccount } from '../../../../core/services/ledger/ledger.service';
import { AccountCardComponent } from './account-card.component';
import { AccountRowComponent } from './account-row.component';

export interface AccountNode extends LedgerAccount {
  children: AccountNode[];
  calculatedBalance: number;
}

export interface HierarchicalAccounts {
  [key: string]: AccountNode[];
}

@Component({
  selector: 'app-accounts-tab',
  imports: [CommonModule, AccountCardComponent, AccountRowComponent],
  templateUrl: './accounts-tab.component.html',
  styleUrl: './accounts-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountsTabComponent {
  hierarchicalAccounts = input.required<HierarchicalAccounts>();
  selectedAccount = input.required<LedgerAccount | null>();
  formatCurrency = input.required<(amount: number) => string>();
  getAccountTypeLabel = input.required<(type: string) => string>();
  getAccountTypeTotal = input.required<(type: string) => number>();
  isLoading = input<boolean>(false);

  accountSelect = output<LedgerAccount>();
  viewTransactions = output<LedgerAccount>();

  readonly accountTypes = ['asset', 'liability', 'equity', 'income', 'expense'] as const;

  // Check if there are any accounts at all
  hasAccounts(): boolean {
    return this.accountTypes.some((type) => this.hierarchicalAccounts()[type]?.length > 0);
  }

  onAccountClick(account: LedgerAccount) {
    this.accountSelect.emit(account);
  }

  onViewTransactions(account: LedgerAccount, event: Event) {
    event.stopPropagation();
    this.viewTransactions.emit(account);
  }

  // Helper to get display balance (use calculatedBalance for parents, balance for leaves)
  getDisplayBalance(node: AccountNode): number {
    return node.children.length > 0 ? node.calculatedBalance : node.balance;
  }
}
