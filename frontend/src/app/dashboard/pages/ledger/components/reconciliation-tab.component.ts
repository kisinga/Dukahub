import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { JournalEntry } from '../../../../core/services/ledger/ledger.service';

@Component({
  selector: 'app-reconciliation-tab',
  imports: [CommonModule],
  templateUrl: './reconciliation-tab.component.html',
  styleUrl: './reconciliation-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReconciliationTabComponent {
  entries = input.required<JournalEntry[]>();
  isLoading = input.required<boolean>();
  totalPages = input.required<number>();
  currentPage = input.required<number>();
  formatDate = input.required<(date: string) => string>();
  formatDateTime = input.required<(date: string) => string>();

  entryView = output<JournalEntry>();
  pageChange = output<number>();

  onViewEntry(entry: JournalEntry) {
    this.entryView.emit(entry);
  }

  onPageChange(page: number) {
    this.pageChange.emit(page);
  }
}

