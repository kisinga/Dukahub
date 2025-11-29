import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface AccountingStats {
  totalDebits: number;
  totalCredits: number;
  netBalance: number;
  transactionCount: number;
  dateRange: string;
}

@Component({
  selector: 'app-accounting-stats',
  imports: [CommonModule],
  templateUrl: './accounting-stats.component.html',
  styleUrl: './accounting-stats.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountingStatsComponent {
  stats = input.required<AccountingStats>();
  formatCurrency = input.required<(amount: number) => string>();
}
