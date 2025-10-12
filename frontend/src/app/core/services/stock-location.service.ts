import { Injectable, computed, inject, signal } from '@angular/core';
import type { GetStockLocationsQuery } from '../graphql/generated/graphql';
import { GET_STOCK_LOCATIONS } from '../graphql/product.graphql';
import { ApolloService } from './apollo.service';

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
 * ARCHITECTURE:
 * - Stock Location = Individual shop/warehouse within a company
 * - Stock levels are tracked per variant per location
 * - Products must be assigned to a stock location when stock is added
 * 
 * UX FLOW:
 * - Fetch stock locations when product creation page loads
 * - User selects primary stock location for initial stock
 * - Stock can be distributed to other locations later
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
     * Fetch all stock locations
     * Called when product creation page loads
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
     * Get a stock location by ID
     */
    getLocationById(id: string): StockLocation | null {
        return this.locationsSignal().find((loc) => loc.id === id) || null;
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

