import { Injectable, computed, inject, signal } from '@angular/core';
import type { GetStockLocationsQuery } from '../graphql/generated/graphql';
import { GET_STOCK_LOCATIONS } from '../graphql/operations.graphql';
import { ApolloService } from './apollo.service';
import { CompanyService } from './company.service';

/**
 * Stock Location model
 */
export interface StockLocation {
    id: string;
    name: string;
    description: string;
}

/**
 * Service for managing stock locations (shops/warehouses)
 * 
 * SIMPLIFIED ARCHITECTURE (Nov 2025):
 * - Each channel has ONE default stock location
 * - No location switching (removed for simplicity)
 * - Stock levels tracked at channel level
 * - Cashier status tracked at CHANNEL level (not location)
 * 
 * RATIONALE:
 * - Vendure orders are channel-scoped, not location-scoped
 * - 90% of businesses have one primary location
 * - Multi-location support deferred to Phase 2 (requires custom plugin)
 * - Cashier flow is a channel-wide setting (all orders in channel need approval)
 */
@Injectable({
    providedIn: 'root',
})
export class StockLocationService {
    private readonly apolloService = inject(ApolloService);
    private readonly companyService = inject(CompanyService);

    // State signals
    private readonly locationsSignal = signal<StockLocation[]>([]);
    private readonly isLoadingSignal = signal(false);
    private readonly errorSignal = signal<string | null>(null);

    // Public readonly signals
    readonly locations = this.locationsSignal.asReadonly();
    readonly isLoading = this.isLoadingSignal.asReadonly();
    readonly error = this.errorSignal.asReadonly();

    // Computed: Check if we have any locations
    readonly hasLocations = computed(() => this.locationsSignal().length > 0);

    /**
     * Cashier flow enabled for the active channel
     * Controls whether to show cashier checkout option
     * Delegates to CompanyService which reads from channel custom fields
     */
    readonly cashierFlowEnabled = this.companyService.cashierFlowEnabled;

    /**
     * Cashier open status for the active channel
     * Returns whether cashier is currently available
     * Delegates to CompanyService which reads from channel custom fields
     */
    readonly cashierOpen = this.companyService.cashierOpen;

    /**
     * Fetch all stock locations
     * Called when product creation page loads (without cashier data)
     */
    async fetchStockLocations(): Promise<void> {
        this.isLoadingSignal.set(true);
        this.errorSignal.set(null);

        try {
            const client = this.apolloService.getClient();
            const result = await client.query<GetStockLocationsQuery>({
                query: GET_STOCK_LOCATIONS,
                fetchPolicy: 'network-only',
            });

            console.log('📦 Stock locations query result:', result);

            if (result.data?.stockLocations?.items) {
                const items = result.data.stockLocations.items;
                this.locationsSignal.set(items);
                console.log('✅ Stock locations fetched:', items.length, items);

                if (items.length === 0) {
                    this.errorSignal.set('No stock locations found. Please create a stock location in Vendure admin first.');
                }
            } else {
                this.locationsSignal.set([]);
                this.errorSignal.set('No stock locations found. Please create a stock location in Vendure admin first.');
                console.warn('⚠️ No stock locations data in response');
            }
        } catch (error: any) {
            console.error('❌ Failed to fetch stock locations:', error);
            this.errorSignal.set(error.message || 'Failed to fetch stock locations');
            this.locationsSignal.set([]);
        } finally {
            this.isLoadingSignal.set(false);
        }
    }

    /**
     * Fetch all stock locations (alias for backwards compatibility)
     * Cashier status is now tracked at channel level via CompanyService
     * 
     * @deprecated Use fetchStockLocations() instead
     */
    async fetchStockLocationsWithCashier(): Promise<void> {
        await this.fetchStockLocations();
    }

    /**
     * Get a stock location by ID
     */
    getLocationById(id: string): StockLocation | null {
        return this.locationsSignal().find((loc) => loc.id === id) || null;
    }

    /**
     * Get the default stock location (first location)
     * In simplified architecture, each channel has one primary location
     */
    getDefaultLocation(): StockLocation | null {
        const locs = this.locationsSignal();
        return locs.length > 0 ? locs[0] : null;
    }

    /**
     * Clear cached locations
     * Useful when switching channels
     */
    clearLocations(): void {
        this.locationsSignal.set([]);
        this.errorSignal.set(null);
    }
}

