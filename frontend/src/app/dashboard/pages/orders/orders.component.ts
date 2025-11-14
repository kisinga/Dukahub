import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
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
    private readonly route = inject(ActivatedRoute);

    // State from service
    readonly orders = this.ordersService.orders;
    readonly isLoading = this.ordersService.isLoading;
    readonly error = this.ordersService.error;
    readonly totalItems = this.ordersService.totalItems;

    // Query parameters
    private readonly queryParams = toSignal(this.route.queryParams, { initialValue: {} });

    // Local UI state
    readonly searchQuery = signal('');
    readonly stateFilter = signal('');
    readonly customerIdFilter = signal<string | null>(null);
    readonly currentPage = signal(1);
    readonly itemsPerPage = signal(10);
    readonly pageOptions = [10, 25, 50, 100];

    // Computed: filtered orders
    readonly filteredOrders = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        const stateFilter = this.stateFilter();
        const customerIdFilter = this.customerIdFilter();
        const allOrders = this.orders();

        let filtered = allOrders;

        // Apply customer ID filter (from query param)
        if (customerIdFilter) {
            filtered = filtered.filter(order => order.customer?.id === customerIdFilter);
        }

        // Apply state filter
        if (stateFilter) {
            filtered = filtered.filter(order => order.state === stateFilter);
        }

        // Apply search query
        if (query) {
            filtered = filtered.filter(order => {
                // Search by order code
                const code = order.code?.toLowerCase().trim() || '';
                if (code.includes(query)) return true;

                // Search by customer information
                const customer = order.customer;
                if (customer) {
                    // Search by full name (first + last)
                    const firstName = (customer.firstName || '').toLowerCase().trim();
                    const lastName = (customer.lastName || '').toLowerCase().trim();
                    const fullName = `${firstName} ${lastName}`.trim();
                    
                    if (fullName.includes(query)) return true;
                    
                    // Search by first name or last name separately
                    if (firstName.includes(query) || lastName.includes(query)) return true;
                    
                    // Search by email
                    const email = (customer.emailAddress || '').toLowerCase().trim();
                    if (email.includes(query)) return true;
                }

                return false;
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

    constructor() {
        // Effect to handle customerId query parameter
        effect(() => {
            const params = this.queryParams();
            const customerId = 'customerId' in params ? (params['customerId'] as string) : undefined;
            const orders = this.orders(); // Watch orders to update search query when orders load
            
            if (customerId) {
                this.customerIdFilter.set(customerId);
                
                // After orders are loaded, set search query to customer name for visual feedback
                if (orders.length > 0) {
                    const orderWithCustomer = orders.find(o => o.customer?.id === customerId);
                    if (orderWithCustomer?.customer) {
                        const customer = orderWithCustomer.customer;
                        const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
                        if (fullName) {
                            this.searchQuery.set(fullName);
                        } else if (customer.emailAddress) {
                            this.searchQuery.set(customer.emailAddress);
                        }
                    }
                }
            } else {
                this.customerIdFilter.set(null);
            }
        });
    }

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

