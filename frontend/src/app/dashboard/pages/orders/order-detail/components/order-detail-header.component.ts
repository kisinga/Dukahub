import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { OrderStateBadgeComponent } from '../../components/order-state-badge.component';
import type { OrderDetailHeaderInput } from '../order-detail.types';

/**
 * Order Detail Header Component
 * 
 * Displays order code, state badge, and order date
 */
@Component({
    selector: 'app-order-detail-header',
    imports: [CommonModule, OrderStateBadgeComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b">
            <div>
                <div class="flex items-center gap-3 mb-2">
                    <h2 class="text-2xl font-bold">Order {{ orderCode() }}</h2>
                    <app-order-state-badge [state]="orderState()" />
                </div>
                <p class="text-sm text-base-content/60">
                    Placed: {{ formattedDate() }}
                </p>
            </div>
        </div>
    `,
})
export class OrderDetailHeaderComponent {
    readonly orderCode = input.required<string>();
    readonly orderState = input.required<string>();
    readonly orderDate = input<string | null | undefined>(null);

    readonly formattedDate = computed(() => {
        const date = this.orderDate();
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-KE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    });
}

