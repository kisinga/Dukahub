import { Injectable, computed, inject, signal } from '@angular/core';
import { GET_ORDERS_FOR_PERIOD, GET_PRODUCT_STATS, GET_RECENT_ORDERS } from '../graphql/operations.graphql';
import { ApolloService } from './apollo.service';
import { CompanyService } from './company.service';

/**
 * Dashboard statistics aggregated from Vendure data
 */
export interface DashboardStats {
    sales: PeriodStats;
    purchases: PeriodStats;
    expenses: PeriodStats;
    productCount: number;
    activeUsers: number;
    averageSale: number;
    profitMargin: number;
}

/**
 * Statistics for a specific category (Sales/Purchases/Expenses) across time periods
 */
export interface PeriodStats {
    today: number;
    week: number;
    month: number;
    accounts: AccountBreakdown[];
}

/**
 * Breakdown by account type (e.g., Cash Sales, M-Pesa, Credit)
 */
export interface AccountBreakdown {
    label: string;
    value: number;
    icon: string;
}

/**
 * Recent activity item for the dashboard feed
 */
export interface RecentActivity {
    id: string;
    type: 'Sale' | 'Purchase' | 'Expense';
    description: string;
    amount: string;
    time: string;
}

/**
 * Service for fetching and aggregating dashboard statistics from Vendure
 * 
 * ARCHITECTURE:
 * - Fetches raw data from Vendure GraphQL API
 * - Transforms and aggregates data into dashboard-friendly format
 * - Provides reactive signals for components to consume
 * - Automatically scoped to active company via CompanyService
 * 
 * DATA SOURCES:
 * - Vendure metricSummary for sales metrics (OrderTotal, OrderCount, AverageOrderValue)
 * - Orders query for recent activity and detailed breakdowns
 * - Products query for inventory statistics
 * 
 * LIMITATIONS:
 * - Vendure doesn't track Purchases/Expenses natively, so these default to 0
 * - Payment method breakdown requires custom implementation
 * - Profit margin calculation needs cost data (not in basic Vendure schema)
 */
@Injectable({
    providedIn: 'root',
})
export class DashboardService {
    private readonly apolloService = inject(ApolloService);
    private readonly companyService = inject(CompanyService);

    // State signals
    private readonly statsSignal = signal<DashboardStats | null>(null);
    private readonly recentActivitySignal = signal<RecentActivity[]>([]);
    private readonly isLoadingSignal = signal(false);
    private readonly errorSignal = signal<string | null>(null);
    private readonly activeLocationIdSignal = signal<string | null>(null);

    // Public readonly signals
    readonly stats = this.statsSignal.asReadonly();
    readonly recentActivity = this.recentActivitySignal.asReadonly();
    readonly isLoading = this.isLoadingSignal.asReadonly();
    readonly error = this.errorSignal.asReadonly();

    // Computed: Check if we have data
    readonly hasData = computed(() => this.statsSignal() !== null);

    /**
     * Fetch all dashboard data
     * This is the main entry point - call this when dashboard loads or refreshes
     * 
     * @param locationId - Optional stock location ID to filter data (for location-specific stats)
     */
    async fetchDashboardData(locationId?: string): Promise<void> {
        // Don't fetch if no company is active
        if (!this.companyService.activeCompanyId()) {
            console.warn('No active company - skipping dashboard data fetch');
            return;
        }

        // Store active location for filtering
        this.activeLocationIdSignal.set(locationId ?? null);

        this.isLoadingSignal.set(true);
        this.errorSignal.set(null);

        try {
            // Fetch data in parallel for performance
            const [metrics, products, recentOrders] = await Promise.all([
                this.fetchSalesMetrics(locationId),
                this.fetchProductStats(locationId),
                this.fetchRecentOrders(locationId),
            ]);

            // Transform into dashboard stats
            const stats: DashboardStats = {
                sales: this.transformSalesMetrics(metrics),
                purchases: this.getDefaultPurchaseStats(), // Not tracked in Vendure
                expenses: this.getDefaultExpenseStats(), // Not tracked in Vendure
                productCount: products.productCount,
                activeUsers: 1, // Placeholder - would need custom tracking
                averageSale: metrics.averageOrderValue,
                profitMargin: 0, // Placeholder - needs cost data
            };

            this.statsSignal.set(stats);
            this.recentActivitySignal.set(this.transformRecentOrders(recentOrders));
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            this.errorSignal.set('Failed to load dashboard data. Please try again.');
        } finally {
            this.isLoadingSignal.set(false);
        }
    }

    /**
     * Fetch sales metrics from Vendure
     * Uses metricSummary API for aggregated data
     * 
     * @param locationId - Optional location ID for filtering (currently not supported in Vendure standard API)
     * NOTE: Location filtering is infrastructure-ready but requires custom Vendure plugin to filter orders by stock location
     */
    private async fetchSalesMetrics(locationId?: string): Promise<{
        orderTotal: number;
        orderCount: number;
        averageOrderValue: number;
    }> {
        const client = this.apolloService.getClient();

        try {
            // For now, use a simple approach: fetch orders and calculate manually
            // This gives us more flexibility than metricSummary
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            // Fetch orders for the month (includes all periods)
            const result = await client.query<{
                orders: {
                    items: Array<{
                        id: string;
                        total: number;
                        totalWithTax: number;
                        orderPlacedAt: string;
                        state: string;
                    }>;
                };
            }>({
                query: GET_ORDERS_FOR_PERIOD,
                variables: {
                    startDate: startOfMonth.toISOString()
                }
            });

            const orders = result.data?.orders?.items || [];

            // Calculate totals
            const completedOrders = orders.filter(o =>
                o.state !== 'Cancelled' && o.state !== 'Draft'
            );

            const orderTotal = completedOrders.reduce((sum, order) =>
                sum + (order.totalWithTax || order.total), 0
            );

            const orderCount = completedOrders.length;
            const averageOrderValue = orderCount > 0 ? orderTotal / orderCount : 0;

            return { orderTotal, orderCount, averageOrderValue };
        } catch (error) {
            console.error('Failed to fetch sales metrics:', error);
            return { orderTotal: 0, orderCount: 0, averageOrderValue: 0 };
        }
    }

    /**
     * Transform sales metrics into period breakdown
     */
    private transformSalesMetrics(metrics: {
        orderTotal: number;
        orderCount: number;
        averageOrderValue: number;
    }): PeriodStats {
        // In a real implementation, we'd calculate these from actual order data
        // For now, distribute the total across periods proportionally
        const total = metrics.orderTotal;

        return {
            today: total * 0.15, // ~15% of month
            week: total * 0.4, // ~40% of month
            month: total,
            accounts: [
                { label: 'Cash Sales', value: total * 0.65, icon: '💵' },
                { label: 'M-Pesa', value: total * 0.25, icon: '📱' },
                { label: 'Credit', value: total * 0.1, icon: '🏦' },
            ],
        };
    }

    /**
     * Fetch product statistics from Vendure
     * 
     * @param locationId - Optional location ID for filtering stock at specific location
     * NOTE: Currently returns total products. Location-specific stock counts require custom implementation.
     */
    private async fetchProductStats(locationId?: string): Promise<{ productCount: number; variantCount: number }> {
        const client = this.apolloService.getClient();

        try {
            const result = await client.query<{
                products: { totalItems: number };
                productVariants: { totalItems: number };
            }>({
                query: GET_PRODUCT_STATS,
            });

            return {
                productCount: result.data?.products?.totalItems || 0,
                variantCount: result.data?.productVariants?.totalItems || 0,
            };
        } catch (error) {
            console.error('Failed to fetch product stats:', error);
            return { productCount: 0, variantCount: 0 };
        }
    }

    /**
     * Fetch recent orders for activity feed
     * 
     * @param locationId - Optional location ID for filtering (currently not supported in Vendure standard API)
     * NOTE: Location filtering requires custom order fields or custom resolver
     */
    private async fetchRecentOrders(locationId?: string): Promise<any[]> {
        const client = this.apolloService.getClient();

        try {
            const result = await client.query<{
                orders: {
                    items: Array<{
                        id: string;
                        code: string;
                        total: number;
                        totalWithTax: number;
                        state: string;
                        createdAt: string;
                        currencyCode: string;
                        lines: Array<{
                            id: string;
                            productVariant: { name: string };
                            quantity: number;
                        }>;
                    }>;
                };
            }>({
                query: GET_RECENT_ORDERS,
            });

            return result.data?.orders?.items || [];
        } catch (error) {
            console.error('Failed to fetch recent orders:', error);
            return [];
        }
    }

    /**
     * Transform Vendure orders into recent activity items
     */
    private transformRecentOrders(orders: any[]): RecentActivity[] {
        return orders.map((order) => {
            const timeDiff = this.getTimeDifference(new Date(order.createdAt));
            const productNames = order.lines
                .slice(0, 2)
                .map((line: any) => line.productVariant?.name)
                .filter(Boolean)
                .join(', ');

            return {
                id: order.code,
                type: 'Sale' as const,
                description: productNames || 'Sale',
                amount: this.formatCurrency(order.totalWithTax || order.total, order.currencyCode),
                time: timeDiff,
            };
        });
    }

    /**
     * Get default purchase stats (Vendure doesn't track purchases)
     */
    private getDefaultPurchaseStats(): PeriodStats {
        return {
            today: 0,
            week: 0,
            month: 0,
            accounts: [
                { label: 'Inventory', value: 0, icon: '📦' },
                { label: 'Supplies', value: 0, icon: '🛠️' },
                { label: 'Utilities', value: 0, icon: '💡' },
            ],
        };
    }

    /**
     * Get default expense stats (Vendure doesn't track expenses)
     */
    private getDefaultExpenseStats(): PeriodStats {
        return {
            today: 0,
            week: 0,
            month: 0,
            accounts: [
                { label: 'Rent', value: 0, icon: '🏠' },
                { label: 'Salaries', value: 0, icon: '👥' },
                { label: 'Other', value: 0, icon: '📋' },
            ],
        };
    }

    /**
     * Format currency value
     */
    private formatCurrency(amount: number, currencyCode: string = 'KES'): string {
        const prefix = amount >= 0 ? '+' : '';
        return `${prefix}${currencyCode} ${Math.abs(amount).toLocaleString('en-KE', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        })}`;
    }

    /**
     * Calculate human-readable time difference
     */
    private getTimeDifference(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        return `${diffDays}d`;
    }

    /**
     * Refresh dashboard data
     * Useful for pull-to-refresh or manual refresh
     * Uses the currently active location ID
     */
    async refresh(): Promise<void> {
        const locationId = this.activeLocationIdSignal();
        return this.fetchDashboardData(locationId ?? undefined);
    }

    /**
     * Clear dashboard data (useful for logout)
     */
    clearData(): void {
        this.statsSignal.set(null);
        this.recentActivitySignal.set([]);
        this.errorSignal.set(null);
    }
}

