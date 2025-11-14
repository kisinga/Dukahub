import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyService } from '../../../../core/services/currency.service';
import { PaymentWithOrder } from '../../../../core/services/payments.service';
import { PaymentStateBadgeComponent } from './payment-state-badge.component';

export type PaymentAction = 'view';

/**
 * Payment Card Component for mobile view
 */
@Component({
    selector: 'app-payment-card',
    imports: [CommonModule, RouterLink, PaymentStateBadgeComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card bg-base-100 shadow">
            <div class="card-body p-4">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h3 class="font-bold text-lg">Order {{ payment().order.code }}</h3>
                        <p class="text-sm text-base-content/60">{{ formatDate(payment().createdAt) }}</p>
                    </div>
                    <app-payment-state-badge [state]="payment().state" />
                </div>
                
                @if (payment().order.customer) {
                    <div class="text-sm mb-2">
                        <span class="text-base-content/60">Customer:</span>
                        <span class="ml-1">{{ getCustomerName() }}</span>
                    </div>
                }
                
                <div class="text-sm mb-2">
                    <span class="text-base-content/60">Method:</span>
                    <span class="ml-1">{{ payment().method }}</span>
                </div>
                
                @if (payment().transactionId) {
                    <div class="text-sm mb-2">
                        <span class="text-base-content/60">Transaction ID:</span>
                        <span class="ml-1 font-mono text-xs">{{ payment().transactionId }}</span>
                    </div>
                }
                
                <div class="flex justify-between items-center mt-3 pt-3 border-t border-base-300">
                    <div>
                        <span class="text-sm text-base-content/60">Amount:</span>
                        <span class="ml-2 font-bold text-lg">{{ formatCurrency(payment().amount) }}</span>
                    </div>
                    <button
                        class="btn btn-sm btn-primary"
                        (click)="onAction('view')"
                        [routerLink]="['/dashboard/payments', payment().id]"
                    >
                        View
                    </button>
                </div>
            </div>
        </div>
    `,
})
export class PaymentCardComponent {
    private readonly currencyService = inject(CurrencyService);
    readonly payment = input.required<PaymentWithOrder>();
    readonly action = output<{ action: PaymentAction; paymentId: string }>();

    getCustomerName(): string {
        const customer = this.payment().order.customer;
        if (!customer) return 'Walk-in Customer';
        return `${customer.firstName} ${customer.lastName}`.trim() || 'Walk-in Customer';
    }

    formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-KE', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    formatCurrency(amount: number): string {
        return this.currencyService.format(amount, false);
    }

    onAction(actionType: PaymentAction): void {
        this.action.emit({ action: actionType, paymentId: this.payment().id });
    }
}

