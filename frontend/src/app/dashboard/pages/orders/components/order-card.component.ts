import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyService } from '../../../../core/services/currency.service';
import { OrderStateBadgeComponent } from './order-state-badge.component';

export interface OrderCardData {
    id: string;
    code: string;
    state: string;
    createdAt: string;
    orderPlacedAt?: string | null;
    total: number;
    totalWithTax: number;
    currencyCode: string;
    customer?: {
        id: string;
        firstName: string;
        lastName: string;
        emailAddress?: string | null;
    } | null;
    lines: Array<{
        id: string;
        quantity: number;
        productVariant: {
            id: string;
            name: string;
        };
    }>;
}

export type OrderAction = 'view' | 'print';

/**
 * Order Card Component for mobile view
 */
@Component({
    selector: 'app-order-card',
    imports: [CommonModule, RouterLink, OrderStateBadgeComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card bg-base-100 shadow">
            <div class="card-body p-4">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h3 class="font-bold text-lg">{{ order().code }}</h3>
                        <p class="text-sm text-base-content/60">{{ formatDate(order().orderPlacedAt || order().createdAt) }}</p>
                    </div>
                    <app-order-state-badge [state]="order().state" />
                </div>
                
                @if (order().customer) {
                    <div class="text-sm mb-2">
                        <span class="text-base-content/60">Customer:</span>
                        <span class="ml-1">{{ getCustomerName() }}</span>
                    </div>
                }
                
                <div class="text-sm mb-2">
                    <span class="text-base-content/60">Items:</span>
                    <span class="ml-1">{{ getItemCount() }}</span>
                </div>
                
                <div class="flex justify-between items-center mt-3 pt-3 border-t border-base-300">
                    <div>
                        <span class="text-sm text-base-content/60">Total:</span>
                        <span class="ml-2 font-bold text-lg">{{ formatCurrency(order().totalWithTax) }}</span>
                    </div>
                    <div class="flex gap-2">
                        <button
                            class="btn btn-sm btn-ghost"
                            (click)="onAction('view')"
                            [routerLink]="['/dashboard/orders', order().id]"
                        >
                            View
                        </button>
                        @if (canPrint()) {
                            <button
                                class="btn btn-sm btn-primary"
                                (click)="onAction('print')"
                                [routerLink]="['/dashboard/orders', order().id]"
                                [queryParams]="{ print: true }"
                            >
                                Print
                            </button>
                        }
                    </div>
                </div>
            </div>
        </div>
    `,
})
export class OrderCardComponent {
    private readonly currencyService = inject(CurrencyService);
    readonly order = input.required<OrderCardData>();
    readonly action = output<{ action: OrderAction; orderId: string }>();

    getCustomerName(): string {
        const customer = this.order().customer;
        if (!customer) return 'Walk-in Customer';
        return `${customer.firstName} ${customer.lastName}`.trim() || 'Walk-in Customer';
    }

    getItemCount(): number {
        return this.order().lines.reduce((sum, line) => sum + line.quantity, 0);
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

    canPrint(): boolean {
        const state = this.order().state;
        return state !== 'Draft';
    }

    onAction(actionType: OrderAction): void {
        this.action.emit({ action: actionType, orderId: this.order().id });
    }
}

