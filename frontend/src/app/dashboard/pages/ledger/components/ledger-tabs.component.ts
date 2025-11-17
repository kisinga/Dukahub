import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type TabType = 'overview' | 'accounts' | 'transactions' | 'reconciliation';

@Component({
  selector: 'app-ledger-tabs',
  imports: [CommonModule],
  templateUrl: './ledger-tabs.component.html',
  styleUrl: './ledger-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LedgerTabsComponent {
  activeTab = input.required<TabType>();
  tabChange = output<TabType>();

  setTab(tab: TabType) {
    this.tabChange.emit(tab);
  }
}

