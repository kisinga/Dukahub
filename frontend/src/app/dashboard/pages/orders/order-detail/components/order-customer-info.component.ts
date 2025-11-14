import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { OrderCustomerInfoInput } from '../order-detail.types';

/**
 * Order Customer Info Component
 * 
 * Displays customer name, email, and phone with walk-in detection
 */
@Component({
    selector: 'app-order-customer-info',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div>
            <h3 class="font-semibold mb-2">Customer</h3>
            <p class="text-base-content/80">{{ customerName() }}</p>
            @if (showContactInfo()) {
                @if (customer()?.emailAddress) {
                    <p class="text-sm text-base-content/60">{{ customer()!.emailAddress }}</p>
                }
                @if (customer()?.phoneNumber) {
                    <p class="text-sm text-base-content/60">{{ customer()!.phoneNumber }}</p>
                }
            }
        </div>
    `,
})
export class OrderCustomerInfoComponent {
    readonly customer = input<OrderCustomerInfoInput['customer']>(null);

    readonly customerName = computed(() => {
        const cust = this.customer();
        if (!cust) return 'Walk-in Customer';
        const firstName = cust.firstName || '';
        const lastName = cust.lastName || '';
        return `${firstName} ${lastName}`.trim() || 'Walk-in Customer';
    });

    readonly isWalkInCustomer = computed(() => {
        const cust = this.customer();
        if (!cust) return true;
        const email = cust.emailAddress?.toLowerCase() || '';
        const firstName = cust.firstName?.toLowerCase() || '';
        return email === 'walkin@pos.local' || firstName === 'walk-in';
    });

    readonly showContactInfo = computed(() => {
        return !this.isWalkInCustomer();
    });
}

