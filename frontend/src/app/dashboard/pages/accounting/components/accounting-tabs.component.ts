import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type TabType = 'overview' | 'accounts' | 'transactions' | 'reconciliation';

@Component({
  selector: 'app-accounting-tabs',
  imports: [CommonModule],
  templateUrl: './accounting-tabs.component.html',
  styleUrl: './accounting-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountingTabsComponent {
  activeTab = input.required<TabType>();
  tabChange = output<TabType>();

  setTab(tab: TabType) {
    this.tabChange.emit(tab);
  }
}
