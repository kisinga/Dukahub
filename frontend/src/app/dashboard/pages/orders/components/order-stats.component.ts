import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface OrderStats {
    totalOrders: number;
    draftOrders: number;
    unpaidOrders: number;
    paidOrders: number;
    todayOrders: number;
}

/**
 * Order Statistics Component
 * 
 * Displays order statistics in cards
 */
@Component({
    selector: 'app-order-stats',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div class="stat bg-base-100 shadow rounded-lg">
                <div class="stat-title">Total Orders</div>
                <div class="stat-value text-primary">{{ stats().totalOrders }}</div>
            </div>
            <div class="stat bg-base-100 shadow rounded-lg">
                <div class="stat-title">Draft</div>
                <div class="stat-value text-neutral">{{ stats().draftOrders }}</div>
            </div>
            <div class="stat bg-base-100 shadow rounded-lg">
                <div class="stat-title">Unpaid</div>
                <div class="stat-value text-warning">{{ stats().unpaidOrders }}</div>
            </div>
            <div class="stat bg-base-100 shadow rounded-lg">
                <div class="stat-title">Paid</div>
                <div class="stat-value text-success">{{ stats().paidOrders }}</div>
            </div>
            <div class="stat bg-base-100 shadow rounded-lg">
                <div class="stat-title">Today</div>
                <div class="stat-value text-info">{{ stats().todayOrders }}</div>
            </div>
        </div>
    `,
})
export class OrderStatsComponent {
    readonly stats = input.required<OrderStats>();
}

