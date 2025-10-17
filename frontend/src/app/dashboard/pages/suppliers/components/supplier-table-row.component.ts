import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { SupplierAction } from './supplier-card.component';

@Component({
    selector: 'app-supplier-table-row',
    imports: [CommonModule],
    templateUrl: './supplier-table-row.component.html',
    styleUrl: './supplier-table-row.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupplierTableRowComponent {
    @Input({ required: true }) supplier!: any;
    @Output() action = new EventEmitter<{ action: SupplierAction; supplierId: string }>();

    onAction(action: SupplierAction): void {
        this.action.emit({ action, supplierId: this.supplier.id });
    }

    getFullName(): string {
        return `${this.supplier.firstName || ''} ${this.supplier.lastName || ''}`.trim();
    }

    getInitials(): string {
        const first = this.supplier.firstName?.charAt(0) || '';
        const last = this.supplier.lastName?.charAt(0) || '';
        return (first + last).toUpperCase();
    }

    getAddressCount(): number {
        return this.supplier.addresses?.length || 0;
    }

    isVerified(): boolean {
        return this.supplier.user?.verified || false;
    }

    getCreatedDate(): string {
        return new Date(this.supplier.createdAt).toLocaleDateString();
    }

    getContactInfo(): string {
        const parts = [];
        if (this.supplier.emailAddress) parts.push(this.supplier.emailAddress);
        if (this.supplier.phoneNumber) parts.push(this.supplier.phoneNumber);
        return parts.join(' • ');
    }

    getSupplierCode(): string {
        return this.supplier.customFields?.supplierCode || 'N/A';
    }

    getSupplierType(): string {
        return this.supplier.customFields?.supplierType || 'General';
    }
}
