import { Injectable, inject } from '@angular/core';
import { GET_ORDERS_FOR_PERIOD } from '../../graphql/operations.graphql';
import { ApolloService } from '../apollo.service';
import { AccountBreakdown, PeriodStats } from '../dashboard.service';
import { clusterPayments } from './payment-clusterer.util';
import { calculatePeriods, filterByPeriod } from './period-calculator.util';

/**
 * Sales Metrics Service
 * 
 * Handles all sales-related data fetching and calculations.
 * Single responsibility: sales metrics computation.
 */
@Injectable({
    providedIn: 'root',
})
export class SalesMetricsService {
    private readonly apolloService = inject(ApolloService);

    /**
     * Fetch and calculate sales metrics for dashboard
     * Returns both summary metrics and period breakdown with payment clustering
     */
    async fetchSalesMetrics(): Promise<{
        orderTotal: number;
        orderCount: number;
        averageOrderValue: number;
        periodStats: PeriodStats;
    }> {
        const client = this.apolloService.getClient();
        const periods = calculatePeriods();

        try {
            // Fetch orders for the month (includes all periods)
            const result = await client.query<{
                orders: {
                    items: Array<{
                        id: string;
                        total: number;
                        totalWithTax: number;
                        orderPlacedAt: string;
                        state: string;
                        payments?: Array<{
                            id: string;
                            amount: number;
                            method: string;
                            state: string;
                        }>;
                    }>;
                };
            }>({
                query: GET_ORDERS_FOR_PERIOD,
                variables: {
                    startDate: periods.startOfMonth.toISOString()
                }
            });

            const orders = result.data?.orders?.items || [];
            const completedOrders = orders.filter(o =>
                o.state !== 'Cancelled' && o.state !== 'Draft'
            );

            // Calculate totals in cents, then convert to currency units
            const orderTotalCents = completedOrders.reduce((sum, order) =>
                sum + (order.totalWithTax || order.total), 0
            );
            const orderTotal = orderTotalCents / 100;
            const orderCount = completedOrders.length;
            const averageOrderValue = orderCount > 0 ? orderTotal / orderCount : 0;

            // Calculate period breakdown with payment clustering
            const periodStats = this.calculatePeriodStats(completedOrders, periods);

            return {
                orderTotal,
                orderCount,
                averageOrderValue,
                periodStats,
            };
        } catch (error) {
            console.error('Failed to fetch sales metrics:', error);
            return {
                orderTotal: 0,
                orderCount: 0,
                averageOrderValue: 0,
                periodStats: this.getEmptyPeriodStats(),
            };
        }
    }

    /**
     * Calculate period stats from orders
     */
    private calculatePeriodStats(
        orders: Array<{
            totalWithTax: number;
            orderPlacedAt: string;
            payments?: Array<{
                id: string;
                amount: number;
                method: string;
                state: string;
            }>;
        }>,
        periods: ReturnType<typeof calculatePeriods>
    ): PeriodStats {
        // Filter by period
        const todayOrders = filterByPeriod(orders, periods.startOfToday);
        const weekOrders = filterByPeriod(orders, periods.startOfWeek);

        // Calculate period totals (in cents, then convert to currency units)
        const todayTotalCents = todayOrders.reduce((sum, o) => sum + (o.totalWithTax || 0), 0);
        const weekTotalCents = weekOrders.reduce((sum, o) => sum + (o.totalWithTax || 0), 0);
        const monthTotalCents = orders.reduce((sum, o) => sum + (o.totalWithTax || 0), 0);

        const today = todayTotalCents / 100;
        const week = weekTotalCents / 100;
        const month = monthTotalCents / 100;

        // Cluster payments into cash vs credit
        // Always show both accounts even if totals are 0
        const { cashTotal, creditTotal } = clusterPayments(orders);

        const accounts: AccountBreakdown[] = [
            { label: 'Cash Sales', value: cashTotal, icon: '💵' },
            { label: 'Credit', value: creditTotal, icon: '🏦' },
        ];

        // Always return accounts array (even with 0 values) so breakdown is always visible
        return {
            today,
            week,
            month,
            accounts,
        };
    }

    /**
     * Get empty period stats (fallback)
     * Always include empty accounts array so breakdown structure is consistent
     */
    private getEmptyPeriodStats(): PeriodStats {
        return {
            today: 0,
            week: 0,
            month: 0,
            accounts: [
                { label: 'Cash Sales', value: 0, icon: '💵' },
                { label: 'Credit', value: 0, icon: '🏦' },
            ],
        };
    }
}

