import { Injectable, inject } from '@angular/core';
import { GET_PURCHASES } from '../../graphql/operations.graphql';
import { ApolloService } from '../apollo.service';
import { AccountBreakdown, PeriodStats } from '../dashboard.service';
import { calculatePeriods, filterByPeriod } from './period-calculator.util';

/**
 * Purchase Metrics Service
 * 
 * Handles all purchase-related data fetching and calculations.
 * Single responsibility: purchase metrics computation.
 */
@Injectable({
    providedIn: 'root',
})
export class PurchaseMetricsService {
    private readonly apolloService = inject(ApolloService);

    /**
     * Fetch and calculate purchase metrics for dashboard
     */
    async fetchPurchaseMetrics(): Promise<PeriodStats> {
        const client = this.apolloService.getClient();
        const periods = calculatePeriods();

        try {
            // Fetch all purchases for the month
            const result = await client.query<{
                purchases: {
                    items: Array<{
                        id: string;
                        totalCost: number; // In cents
                        purchaseDate: string;
                        lines: Array<{
                            variantId: string;
                            unitCost: number; // In cents
                            totalCost: number; // In cents
                        }>;
                    }>;
                };
            }>({
                query: GET_PURCHASES,
                variables: {
                    options: {
                        filter: {
                            purchaseDate: { after: periods.startOfMonth.toISOString() }
                        },
                        take: 1000
                    }
                }
            });

            const purchases = result.data?.purchases?.items || [];

            // Filter by period
            const todayPurchases = filterByPeriod(purchases, periods.startOfToday);
            const weekPurchases = filterByPeriod(purchases, periods.startOfWeek);

            // Calculate totals in cents, then convert to currency units
            const todayTotalCents = todayPurchases.reduce((sum, p) => sum + (p.totalCost || 0), 0);
            const weekTotalCents = weekPurchases.reduce((sum, p) => sum + (p.totalCost || 0), 0);
            const monthTotalCents = purchases.reduce((sum, p) => sum + (p.totalCost || 0), 0);

            const today = todayTotalCents / 100;
            const week = weekTotalCents / 100;
            const month = monthTotalCents / 100;

            // For breakdown, since only inventory records exist, show all as inventory
            // But always show at least one account entry for consistency
            const accounts: AccountBreakdown[] = month > 0
                ? [{ label: 'Inventory', value: month, icon: '📦' }]
                : []; // Empty if no purchases

            return {
                today,
                week,
                month,
                accounts,
            };
        } catch (error) {
            console.error('Failed to fetch purchase metrics:', error);
            return {
                today: 0,
                week: 0,
                month: 0,
                accounts: [
                    { label: 'Inventory', value: 0, icon: '📦' },
                ],
            };
        }
    }
}

