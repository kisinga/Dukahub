import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { JournalEntry } from '../../../../core/services/ledger/ledger.service';

@Component({
  selector: 'app-transactions-tab',
  imports: [CommonModule],
  templateUrl: './transactions-tab.component.html',
  styleUrl: './transactions-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsTabComponent {
  entries = input.required<JournalEntry[]>();
  isLoading = input.required<boolean>();
  expandedEntries = input.required<Set<string>>();
  totalPages = input.required<number>();
  currentPage = input.required<number>();
  searchTerm = input.required<string>();
  selectedAccount = input.required<any>();
  sourceTypeFilter = input.required<string>();
  dateFilter = input.required<{ start?: string; end?: string }>();
  formatCurrency = input.required<(amount: number) => string>();
  formatDate = input.required<(date: string) => string>();
  getEntryTotalDebit = input.required<(entry: JournalEntry) => number>();
  getEntryTotalCredit = input.required<(entry: JournalEntry) => number>();

  entryToggle = output<string>();
  entryView = output<JournalEntry>();
  expandAll = output<void>();
  collapseAll = output<void>();
  pageChange = output<number>();
  clearFilters = output<void>();

  onToggleEntry(entryId: string) {
    this.entryToggle.emit(entryId);
  }

  onViewEntry(entry: JournalEntry) {
    this.entryView.emit(entry);
  }

  onPageChange(page: number) {
    this.pageChange.emit(page);
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchTerm() ||
      this.selectedAccount() ||
      this.sourceTypeFilter() ||
      this.dateFilter().start ||
      this.dateFilter().end
    );
  }
}

