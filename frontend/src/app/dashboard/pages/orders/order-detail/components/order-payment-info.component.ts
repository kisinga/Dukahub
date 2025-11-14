import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { OrderPaymentInfoInput } from '../order-detail.types';

/**
 * Order Payment Info Component
 * 
 * Displays payment method and status
 */
@Component({
    selector: 'app-order-payment-info',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="mb-6">
            <h3 class="font-semibold mb-2">Payment</h3>
            <p><strong>Method:</strong> {{ paymentMethod() }}</p>
            @if (primaryPayment()) {
                <p class="text-sm text-base-content/60">Status: {{ primaryPayment()!.state }}</p>
                <p class="text-sm text-base-content/60">
                    Date: {{ formattedDate() }}
                </p>
            }
        </div>
    `,
})
export class OrderPaymentInfoComponent {
    readonly payments = input<OrderPaymentInfoInput['payments']>(null);

    readonly primaryPayment = computed(() => {
        const payments = this.payments();
        return payments && payments.length > 0 ? payments[0] : null;
    });

    readonly paymentMethod = computed(() => {
        const payment = this.primaryPayment();
        return payment?.method || 'N/A';
    });

    readonly formattedDate = computed(() => {
        const payment = this.primaryPayment();
        if (!payment?.createdAt) return 'N/A';
        return new Date(payment.createdAt).toLocaleDateString('en-KE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    });
}

