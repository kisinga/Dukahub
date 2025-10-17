import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CustomerAction } from './customer-card.component';

@Component({
  selector: 'app-customer-table-row',
  imports: [CommonModule],
  templateUrl: './customer-table-row.component.html',
  styleUrl: './customer-table-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerTableRowComponent {
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

  getContactInfo(): string {
    const parts = [];
    if (this.customer.emailAddress) parts.push(this.customer.emailAddress);
    if (this.customer.phoneNumber) parts.push(this.customer.phoneNumber);
    return parts.join(' • ');
  }
}
