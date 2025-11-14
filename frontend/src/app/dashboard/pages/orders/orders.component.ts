import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { OrdersService } from '../../../core/services/orders.service';
import { PaginationComponent } from '../customers/components/pagination.component';
import { OrderAction, OrderCardComponent } from './components/order-card.component';
import { OrderSearchBarComponent } from './components/order-search-bar.component';
import { OrderStats, OrderStatsComponent } from './components/order-stats.component';
import { OrderTableRowComponent } from './components/order-table-row.component';

/**
 * Orders list page - refactored with composable components
 * 
 * ARCHITECTURE:
 * - Uses composable components for better maintainability
 * - Separates mobile (cards) and desktop (table) views
 * - Centralized action handling
 * - KISS principles applied
 */
@Component({
    selector: 'app-orders',
    imports: [
        CommonModule,
        OrderCardComponent,
        OrderStatsComponent,
        OrderSearchBarComponent,
        OrderTableRowComponent,
        PaginationComponent,
    ],
    templateUrl: './orders.component.html',
    styleUrl: './orders.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersComponent implements OnInit {
    private readonly ordersService = inject(OrdersService);
    private readonly router = inject(Router);

    // State from service
    readonly orders = this.ordersService.orders;
    readonly isLoading = this.ordersService.isLoading;
    readonly error = this.ordersService.error;
    readonly totalItems = this.ordersService.totalItems;

    // Local UI state
    readonly searchQuery = signal('');
    readonly stateFilter = signal('');
    readonly currentPage = signal(1);
    readonly itemsPerPage = signal(10);
    readonly pageOptions = [10, 25, 50, 100];

    // Computed: filtered orders
    readonly filteredOrders = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        const stateFilter = this.stateFilter();
        const allOrders = this.orders();

        let filtered = allOrders;

        // Apply state filter
        if (stateFilter) {
            filtered = filtered.filter(order => order.state === stateFilter);
        }

        // Apply search query
        if (query) {
            filtered = filtered.filter(order => {
                const code = order.code?.toLowerCase() || '';
                const customerName = order.customer
                    ? `${order.customer.firstName} ${order.customer.lastName}`.toLowerCase()
                    : '';
                const customerEmail = order.customer?.emailAddress?.toLowerCase() || '';
                return code.includes(query) || customerName.includes(query) || customerEmail.includes(query);
            });
        }

        return filtered;
    });

    // Computed: paginated orders
    readonly paginatedOrders = computed(() => {
        const filtered = this.filteredOrders();
        const page = this.currentPage();
        const perPage = this.itemsPerPage();
        const start = (page - 1) * perPage;
        const end = start + perPage;

        return filtered.slice(start, end);
    });

    // Computed: total pages
    readonly totalPages = computed(() => {
        const filtered = this.filteredOrders();
        const perPage = this.itemsPerPage();
        return Math.ceil(filtered.length / perPage) || 1;
    });

    // Computed: statistics
    readonly stats = computed((): OrderStats => {
        const orders = this.orders();
        const totalOrders = orders.length;
        const draftOrders = orders.filter(o => o.state === 'Draft').length;
        const unpaidOrders = orders.filter(o => o.state === 'ArrangingPayment').length;
        const paidOrders = orders.filter(o => o.state === 'PaymentSettled' || o.state === 'Fulfilled').length;

        // Today's orders
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayOrders = orders.filter(o => {
            const orderDate = new Date(o.orderPlacedAt || o.createdAt);
            orderDate.setHours(0, 0, 0, 0);
            return orderDate.getTime() === today.getTime();
        }).length;

        return { totalOrders, draftOrders, unpaidOrders, paidOrders, todayOrders };
    });

    // Computed: end item for pagination display
    readonly endItem = computed(() => {
        return Math.min(this.currentPage() * this.itemsPerPage(), this.filteredOrders().length);
    });

    ngOnInit(): void {
        this.loadOrders();
    }

    async loadOrders(): Promise<void> {
        await this.ordersService.fetchOrders({
            take: 100,
            skip: 0,
            sort: { createdAt: 'DESC' as any },
        });
    }

    async refreshOrders(): Promise<void> {
        await this.loadOrders();
    }

    /**
     * Handle order actions (view, print)
     */
    onOrderAction(event: { action: OrderAction; orderId: string }): void {
        const { action, orderId } = event;

        switch (action) {
            case 'view':
                this.router.navigate(['/dashboard/orders', orderId]);
                break;

            case 'print':
                this.router.navigate(['/dashboard/orders', orderId], { queryParams: { print: true } });
                break;
        }
    }

    /**
     * Go to specific page
     */
    goToPage(page: number): void {
        if (page >= 1 && page <= this.totalPages()) {
            this.currentPage.set(page);
        }
    }

    /**
     * Change items per page
     */
    changeItemsPerPage(items: number): void {
        this.itemsPerPage.set(items);
        this.currentPage.set(1); // Reset to first page
    }

    /**
     * Clear error message
     */
    clearError(): void {
        this.ordersService.clearError();
    }

    /**
     * Track by function for ngFor performance
     */
    trackByOrderId(index: number, order: any): string {
        return order.id;
    }

    /**
     * Math utilities for template
     */
    readonly Math = Math;
}

