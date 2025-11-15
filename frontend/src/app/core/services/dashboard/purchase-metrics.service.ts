import { Injectable, inject } from '@angular/core';
import { GET_PURCHASES } from '../../graphql/operations.graphql';
import { ApolloService } from '../apollo.service';
import { PeriodStats } from '../dashboard.service';
import { calculatePeriods } from './period-calculator.util';
import { calculatePurchasePeriodStats } from '../stats/purchase-stats.util';

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
            // Fetch purchases for period calculations
            // Note: We fetch without date filter to ensure we get all purchases,
            // then the utility function filters by period client-side
            // This avoids timezone issues with ISO date strings in GraphQL filters
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
                        take: 1000, // Fetch enough purchases for accurate period calculations
                        sort: { purchaseDate: 'DESC' as any }
                    }
                }
            });

            const purchases = result.data?.purchases?.items || [];

            // Use utility function for calculation - ensures consistency with page components
            return calculatePurchasePeriodStats(purchases, periods);
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

