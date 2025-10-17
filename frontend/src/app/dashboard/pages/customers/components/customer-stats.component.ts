import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface CustomerStats {
  totalCustomers: number;
  verifiedCustomers: number;
  customersWithAddresses: number;
  recentCustomers: number;
}

@Component({
  selector: 'app-customer-stats',
  imports: [CommonModule],
  templateUrl: './customer-stats.component.html',
  styleUrl: './customer-stats.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerStatsComponent {
  @Input({ required: true }) stats!: CustomerStats;
}
