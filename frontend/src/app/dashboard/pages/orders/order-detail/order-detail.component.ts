import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyService } from '../../../../core/services/currency.service';
import { OrdersService } from '../../../../core/services/orders.service';
import { PrintService } from '../../../../core/services/print.service';
import { OrderStateBadgeComponent } from '../components/order-state-badge.component';

/**
 * Order Detail Component
 * 
 * Dual-purpose: view mode and print mode
 * - View mode: Shows order details with print button
 * - Print mode: Shows order details optimized for printing
 */
@Component({
    selector: 'app-order-detail',
    imports: [CommonModule, OrderStateBadgeComponent],
    templateUrl: './order-detail.component.html',
    styleUrl: './order-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailComponent implements OnInit {
    private readonly ordersService = inject(OrdersService);
    private readonly printService = inject(PrintService);
    private readonly currencyService = inject(CurrencyService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    // State
    readonly order = this.ordersService.currentOrder;
    readonly isLoading = this.ordersService.isLoading;
    readonly error = this.ordersService.error;
    readonly selectedTemplate = signal<string>('receipt-52mm');
    readonly isPrintMode = signal(false);

    // Available templates
    readonly templates = this.printService.getAvailableTemplates();

    // Computed values
    readonly canPrint = computed(() => {
        const order = this.order();
        if (!order) return false;
        return order.state !== 'Draft';
    });

    readonly customerName = computed(() => {
        const order = this.order();
        if (!order?.customer) return 'Walk-in Customer';
        const firstName = order.customer.firstName || '';
        const lastName = order.customer.lastName || '';
        return `${firstName} ${lastName}`.trim() || 'Walk-in Customer';
    });

    readonly isWalkInCustomer = computed(() => {
        const order = this.order();
        if (!order?.customer) return true;
        const email = order.customer.emailAddress?.toLowerCase() || '';
        const firstName = order.customer.firstName?.toLowerCase() || '';
        return email === 'walkin@pos.local' || firstName === 'walk-in';
    });

    readonly subtotal = computed(() => {
        const order = this.order();
        if (!order) return 0;
        return order.total;
    });

    readonly tax = computed(() => {
        const order = this.order();
        if (!order) return 0;
        return order.totalWithTax - order.total;
    });

    readonly total = computed(() => {
        const order = this.order();
        if (!order) return 0;
        return order.totalWithTax;
    });

    readonly paymentMethod = computed(() => {
        const order = this.order();
        return order?.payments?.[0]?.method || 'N/A';
    });

    readonly hasFulfillment = computed(() => {
        const order = this.order();
        return order?.fulfillments && order.fulfillments.length > 0;
    });

    readonly hasShipping = computed(() => {
        return this.hasFulfillment() && !this.isWalkInCustomer();
    });

    // Convert route query params to signal
    private readonly queryParams = toSignal(this.route.queryParams, { initialValue: {} });
    private readonly routeParams = toSignal(this.route.paramMap);

    constructor() {
        // Check for print mode from query params
        effect(() => {
            const params = this.queryParams();
            const printParam = (params as Record<string, any>)['print'];
            this.isPrintMode.set(printParam === 'true' || printParam === true);
        });

        // Auto-print if in print mode
        effect(() => {
            const order = this.order();
            const isPrint = this.isPrintMode();
            if (order && isPrint) {
                // Small delay to ensure DOM is ready
                setTimeout(() => {
                    this.handlePrint();
                }, 500);
            }
        });
    }

    ngOnInit(): void {
        const orderId = this.routeParams()?.get('id');
        if (orderId) {
            this.ordersService.fetchOrderById(orderId);
        }
    }

    formatCurrency(amount: number): string {
        return this.currencyService.format(amount, false);
    }

    formatDate(dateString: string | null | undefined): string {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-KE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    async handlePrint(): Promise<void> {
        const order = this.order();
        if (!order) return;

        const templateId = this.selectedTemplate();
        await this.printService.printOrder(order as any, templateId);
    }

    goBack(): void {
        this.router.navigate(['/dashboard/orders']);
    }

    clearError(): void {
        this.ordersService.clearError();
    }
}

