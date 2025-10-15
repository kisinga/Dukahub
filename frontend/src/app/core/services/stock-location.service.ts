import { Injectable, computed, inject, signal } from '@angular/core';
import type { GetStockLocationsQuery, GetStockLocationsWithCashierQuery } from '../graphql/generated/graphql';
import { GET_STOCK_LOCATIONS, GET_STOCK_LOCATIONS_WITH_CASHIER } from '../graphql/product.graphql';
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
 * ARCHITECTURE:
 * - Stock Location = Individual shop/warehouse within a company
 * - Stock levels are tracked per variant per location
 * - Products must be assigned to a stock location when stock is added
 * - Active location determines which location's data is shown in dashboard
 * 
 * UX FLOW:
 * - Fetch stock locations when dashboard loads
 * - User selects active location via navbar dropdown
 * - Dashboard displays location-specific stats
 * - Active location persists to localStorage
 */
@Injectable({
    providedIn: 'root',
})
export class StockLocationService {
    private readonly apolloService = inject(ApolloService);
    private readonly STORAGE_KEY = 'active_location_id';

    // State signals
    private readonly locationsSignal = signal<StockLocation[]>([]);
    private readonly activeLocationIdSignal = signal<string | null>(null);
    private readonly isLoadingSignal = signal(false);
    private readonly errorSignal = signal<string | null>(null);

    // Public readonly signals
    readonly locations = this.locationsSignal.asReadonly();
    readonly activeLocationId = this.activeLocationIdSignal.asReadonly();
    readonly isLoading = this.isLoadingSignal.asReadonly();
    readonly error = this.errorSignal.asReadonly();

    // Computed: Check if we have any locations
    readonly hasLocations = computed(() => this.locationsSignal().length > 0);

    // Computed: Active location object
    readonly activeLocation = computed(() => {
        const id = this.activeLocationIdSignal();
        const locations = this.locationsSignal();
        return locations.find((loc) => loc.id === id) || null;
    });

    /**
     * Cashier flow enabled for the active stock location
     * Controls whether to show cashier checkout option
     */
    readonly cashierFlowEnabled = computed(() => {
        const activeLocation = this.activeLocation();
        return activeLocation?.cashierFlowEnabled ?? false;
    });

    /**
     * Cashier open status for the active stock location
     * Returns the cashier status of the currently active location
     */
    readonly cashierOpen = computed(() => {
        const activeLocation = this.activeLocation();
        return activeLocation?.cashierOpen ?? false;
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
                } else {
                    // Auto-activate first location if none is active
                    if (!this.activeLocationIdSignal() && items.length > 0) {
                        this.activateLocation(items[0].id);
                    }
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
                const items = result.data.stockLocations.items.map(item => ({
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
                } else {
                    // Auto-activate first location if none is active
                    if (!this.activeLocationIdSignal() && items.length > 0) {
                        this.activateLocation(items[0].id);
                    }
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
     * Activate a location - makes it the active location for dashboard filtering
     * @param locationId - The stock location ID to activate
     */
    activateLocation(locationId: string): void {
        const location = this.getLocationById(locationId);
        if (!location) {
            console.warn(`Cannot activate location ${locationId}: not found in locations list`);
            return;
        }

        console.log(`📍 Activating location: ${location.name} (${locationId})`);
        this.activeLocationIdSignal.set(locationId);
        this.persistActiveLocation();
    }

    /**
     * Initialize active location from localStorage
     * Called on app initialization
     */
    initializeFromStorage(): void {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            console.log('📍 Restored active location from storage:', stored);
            this.activeLocationIdSignal.set(stored);
        }
    }

    /**
     * Persist active location to localStorage
     */
    private persistActiveLocation(): void {
        const locationId = this.activeLocationIdSignal();
        if (locationId) {
            localStorage.setItem(this.STORAGE_KEY, locationId);
            console.log('💾 Persisted active location:', locationId);
        }
    }

    /**
     * Clear cached locations
     * Useful when switching channels
     */
    clearLocations(): void {
        this.locationsSignal.set([]);
        this.activeLocationIdSignal.set(null);
        this.errorSignal.set(null);
        localStorage.removeItem(this.STORAGE_KEY);
    }
}

