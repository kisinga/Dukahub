import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CurrencyService } from '../../../../core/services/currency.service';

export type CustomerAction = 'edit' | 'delete';

@Component({
  selector: 'app-customer-card',
  imports: [CommonModule],
  templateUrl: './customer-card.component.html',
  styleUrl: './customer-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerCardComponent {
  @Input({ required: true }) customer!: any;
  @Output() action = new EventEmitter<{ action: CustomerAction; customerId: string }>();
  
  readonly currencyService = inject(CurrencyService);

  onAction(action: CustomerAction): void {
    this.action.emit({ action, customerId: this.customer.id });
  }

  getFullName(): string {
    return `${this.customer.firstName || ''} ${this.customer.lastName || ''}`.trim();
  }

  getInitials(): string {
    const first = this.customer.firstName?.charAt(0) || '';
    const last = this.customer.lastName?.charAt(0) || '';
    return (first + last).toUpperCase();
  }

  isVerified(): boolean {
    return this.customer.user?.verified || false;
  }

  isWalkInCustomer(): boolean {
    if (!this.customer) return false;
    const email = this.customer.emailAddress?.toLowerCase() || '';
    const firstName = this.customer.firstName?.toLowerCase() || '';
    return email === 'walkin@pos.local' || firstName === 'walk-in';
  }

  // Credit information methods
  isCreditApproved(): boolean {
    return Boolean(this.customer.customFields?.isCreditApproved);
  }

  getCreditLimit(): number {
    return Number(this.customer.customFields?.creditLimit ?? 0);
  }

  getOutstandingAmount(): number {
    return Number(this.customer.customFields?.outstandingAmount ?? 0);
  }

  getOutstandingAmountAbs(): number {
    return Math.abs(this.getOutstandingAmount());
  }

  getAvailableCredit(): number {
    const creditLimit = this.getCreditLimit();
    const outstanding = this.getOutstandingAmountAbs();
    return Math.max(creditLimit - outstanding, 0);
  }

  getLastRepaymentDate(): string | null {
    return this.customer.customFields?.lastRepaymentDate ?? null;
  }

  getLastRepaymentAmount(): number {
    return Number(this.customer.customFields?.lastRepaymentAmount ?? 0);
  }

  getCreditDuration(): number {
    return Number(this.customer.customFields?.creditDuration ?? 0);
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return '—';
    }
  }

  formatCurrency(amount: number): string {
    return this.currencyService.format(amount * 100);
  }
}
