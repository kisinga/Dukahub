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
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
            <div class="stat bg-base-100 shadow-sm rounded-lg py-3 sm:py-4 px-3 sm:px-4">
                <div class="stat-title text-xs sm:text-sm">Total Payments</div>
                <div class="stat-value text-lg sm:text-2xl lg:text-3xl text-primary">{{ stats().totalPayments }}</div>
            </div>
            <div class="stat bg-base-100 shadow-sm rounded-lg py-3 sm:py-4 px-3 sm:px-4">
                <div class="stat-title text-xs sm:text-sm">Settled</div>
                <div class="stat-value text-lg sm:text-2xl lg:text-3xl text-success">{{ stats().settledPayments }}</div>
            </div>
            <div class="stat bg-base-100 shadow-sm rounded-lg py-3 sm:py-4 px-3 sm:px-4">
                <div class="stat-title text-xs sm:text-sm">Authorized</div>
                <div class="stat-value text-lg sm:text-2xl lg:text-3xl text-info">{{ stats().authorizedPayments }}</div>
            </div>
            <div class="stat bg-base-100 shadow-sm rounded-lg py-3 sm:py-4 px-3 sm:px-4">
                <div class="stat-title text-xs sm:text-sm">Declined</div>
                <div class="stat-value text-lg sm:text-2xl lg:text-3xl text-error">{{ stats().declinedPayments }}</div>
            </div>
            <div class="stat bg-base-100 shadow-sm rounded-lg py-3 sm:py-4 px-3 sm:px-4 col-span-2 sm:col-span-1">
                <div class="stat-title text-xs sm:text-sm">Today</div>
                <div class="stat-value text-lg sm:text-2xl lg:text-3xl text-warning">{{ stats().todayPayments }}</div>
            </div>
        </div>
    `,
})
export class PaymentStatsComponent {
    readonly stats = input.required<PaymentStats>();
}

