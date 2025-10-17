import { Injectable, computed, inject, signal } from '@angular/core';
import type { GetStockLocationsQuery, GetStockLocationsWithCashierQuery } from '../graphql/generated/graphql';
import { GET_STOCK_LOCATIONS, GET_STOCK_LOCATIONS_WITH_CASHIER } from '../graphql/operations.graphql';
import { ApolloService } from './apollo.service';

/**
 * Stock Location model
 */
export interface StockLocation {
    id: string;
    name: string;
    description: string;
    cashierFlowEnabled?: boolean;
    cashierOpen?: boolean;
}

/**
 * Service for managing stock locations (shops/warehouses)
 * 
 * SIMPLIFIED ARCHITECTURE (Nov 2025):
 * - Each channel has ONE default stock location
 * - No location switching (removed for simplicity)
 * - Stock levels tracked at channel level
 * - Cashier status based on first/default location
 * 
 * RATIONALE:
 * - Vendure orders are channel-scoped, not location-scoped
 * - 90% of businesses have one primary location
 * - Multi-location support deferred to Phase 2 (requires custom plugin)
 */
@Injectable({
    providedIn: 'root',
})
export class StockLocationService {
    private readonly apolloService = inject(ApolloService);

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
     * Cashier flow enabled for the default stock location
     * Controls whether to show cashier checkout option
     */
    readonly cashierFlowEnabled = computed(() => {
        const defaultLocation = this.getDefaultLocation();
        return defaultLocation?.cashierFlowEnabled ?? false;
    });

    /**
     * Cashier open status for the default stock location
     * Returns the cashier status of the default location
     */
    readonly cashierOpen = computed(() => {
        const defaultLocation = this.getDefaultLocation();
        return defaultLocation?.cashierOpen ?? false;
    });

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
     * Fetch all stock locations with cashier status
     * Called when cashier status is needed (e.g., dashboard)
     */
    async fetchStockLocationsWithCashier(): Promise<void> {
        this.isLoadingSignal.set(true);
        this.errorSignal.set(null);

        try {
            const client = this.apolloService.getClient();
            const result = await client.query<GetStockLocationsWithCashierQuery>({
                query: GET_STOCK_LOCATIONS_WITH_CASHIER,
                fetchPolicy: 'network-only',
            });

            console.log('📦 Stock locations with cashier query result:', result);

            if (result.data?.stockLocations?.items) {
                const items = result.data.stockLocations.items.map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    cashierFlowEnabled: item.customFields?.cashierFlowEnabled ?? false,
                    cashierOpen: item.customFields?.cashierOpen ?? false,
                }));

                this.locationsSignal.set(items);
                console.log('✅ Stock locations with cashier fetched:', items.length, items);

                if (items.length === 0) {
                    this.errorSignal.set('No stock locations found. Please create a stock location in Vendure admin first.');
                }
            } else {
                this.locationsSignal.set([]);
                this.errorSignal.set('No stock locations found. Please create a stock location in Vendure admin first.');
                console.warn('⚠️ No stock locations data in response');
            }
        } catch (error: any) {
            console.error('❌ Failed to fetch stock locations with cashier:', error);
            this.errorSignal.set(error.message || 'Failed to fetch stock locations');
            this.locationsSignal.set([]);
        } finally {
            this.isLoadingSignal.set(false);
        }
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

