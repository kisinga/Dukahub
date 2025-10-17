import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export type CustomerAction = 'view' | 'edit' | 'delete';

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

  getAddressCount(): number {
    return this.customer.addresses?.length || 0;
  }

  isVerified(): boolean {
    return this.customer.user?.verified || false;
  }

  getCreatedDate(): string {
    return new Date(this.customer.createdAt).toLocaleDateString();
  }
}
