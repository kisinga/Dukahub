import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface LedgerStats {
  totalDebits: number;
  totalCredits: number;
  netBalance: number;
  transactionCount: number;
  dateRange: string;
}

@Component({
  selector: 'app-ledger-stats',
  imports: [CommonModule],
  templateUrl: './ledger-stats.component.html',
  styleUrl: './ledger-stats.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LedgerStatsComponent {
  stats = input.required<LedgerStats>();
  formatCurrency = input.required<(amount: number) => string>();
}
