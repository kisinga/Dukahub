import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface PaymentStats {
    totalPayments: number;
    settledPayments: number;
    authorizedPayments: number;
    declinedPayments: number;
    todayPayments: number;
}

/**
 * Payment Statistics Component
 * 
 * Displays payment statistics in cards
 */
@Component({
    selector: 'app-payment-stats',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div class="stat bg-base-100 shadow rounded-lg">
                <div class="stat-title">Total Payments</div>
                <div class="stat-value text-primary">{{ stats().totalPayments }}</div>
            </div>
            <div class="stat bg-base-100 shadow rounded-lg">
                <div class="stat-title">Settled</div>
                <div class="stat-value text-success">{{ stats().settledPayments }}</div>
            </div>
            <div class="stat bg-base-100 shadow rounded-lg">
                <div class="stat-title">Authorized</div>
                <div class="stat-value text-info">{{ stats().authorizedPayments }}</div>
            </div>
            <div class="stat bg-base-100 shadow rounded-lg">
                <div class="stat-title">Declined</div>
                <div class="stat-value text-error">{{ stats().declinedPayments }}</div>
            </div>
            <div class="stat bg-base-100 shadow rounded-lg">
                <div class="stat-title">Today</div>
                <div class="stat-value text-warning">{{ stats().todayPayments }}</div>
            </div>
        </div>
    `,
})
export class PaymentStatsComponent {
    readonly stats = input.required<PaymentStats>();
}

