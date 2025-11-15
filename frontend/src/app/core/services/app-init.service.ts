import { Injectable, inject, signal } from '@angular/core';
import { CompanyService } from './company.service';
import { MlModelService } from './ml-model.service';
import { ProductCacheService } from './product/product-cache.service';
import { StockLocationService } from './stock-location.service';

/**
 * Initialization status for dashboard boot
 */
export interface InitStatus {
  productsLoaded: boolean;
  modelLoaded: boolean;
  locationsLoaded: boolean;
  channelId: string | null;
  error: string | null;
}

/**
 * App initialization service
 * Orchestrates boot-time data loading for offline-first operation
 */
@Injectable({
  providedIn: 'root',
})
export class AppInitService {
  private readonly companyService = inject(CompanyService);
  private readonly productCacheService = inject(ProductCacheService);
  private readonly mlModelService = inject(MlModelService);
  private readonly stockLocationService = inject(StockLocationService);

  private readonly initStatusSignal = signal<InitStatus>({
    productsLoaded: false,
    modelLoaded: false,
    locationsLoaded: false,
    channelId: null,
    error: null,
  });

  private readonly isInitializingSignal = signal<boolean>(false);
  private readonly lastInitChannelId = signal<string | null>(null);

  readonly initStatus = this.initStatusSignal.asReadonly();

  /**
   * Initialize dashboard data when channel is set
   * Idempotent: prevents duplicate initialization for same channel
   */
  async initializeDashboard(channelId: string): Promise<void> {
    // Prevent duplicate initialization
    if (this.isInitializingSignal() || this.lastInitChannelId() === channelId) {
      return;
    }

    this.isInitializingSignal.set(true);
    this.lastInitChannelId.set(channelId);
    this.initStatusSignal.update((s) => ({ ...s, channelId, error: null }));

    try {
      // Run prefetch operations in parallel
      const [productsSuccess, modelSuccess, locationsSuccess] = await Promise.allSettled([
        this.prefetchProducts(channelId),
        this.prefetchModel(channelId),
        this.prefetchStockLocations(),
      ]);

      // Update status based on results
      this.initStatusSignal.update((s) => ({
        ...s,
        productsLoaded: productsSuccess.status === 'fulfilled' && productsSuccess.value,
        modelLoaded: modelSuccess.status === 'fulfilled' && modelSuccess.value,
        locationsLoaded: locationsSuccess.status === 'fulfilled' && locationsSuccess.value,
        error:
          productsSuccess.status === 'rejected' ||
            modelSuccess.status === 'rejected' ||
            locationsSuccess.status === 'rejected'
            ? 'Some features failed to initialize'
            : null,
      }));

      const status = this.initStatusSignal();
      if (status.productsLoaded && status.modelLoaded && status.locationsLoaded) {
        console.log('✅ Dashboard initialized');
      } else if (status.productsLoaded && status.locationsLoaded) {
        console.log('⚠️ Dashboard initialized (ML unavailable)');
      } else {
        console.error('❌ Dashboard initialization incomplete');
      }
    } finally {
      this.isInitializingSignal.set(false);
    }
  }

  /**
   * Pre-fetch all products for offline access
   */
  private async prefetchProducts(channelId: string): Promise<boolean> {
    try {
      return await this.productCacheService.prefetchChannelProducts(channelId);
    } catch (error: any) {
      console.error('Failed to prefetch products:', error);
      return false;
    }
  }

  /**
   * Pre-load ML model for instant camera scanning
   */
  private async prefetchModel(channelId: string): Promise<boolean> {
    try {
      // Check if model exists first
      const exists = await this.mlModelService.checkModelExists(channelId);
      if (!exists.exists) {
        console.warn('ML model not available:', exists.error?.message);
        return false;
      }

      return await this.mlModelService.loadModel(channelId);
    } catch (error: any) {
      console.error('Failed to prefetch ML model:', error);
      return false;
    }
  }

  /**
   * Pre-fetch stock locations on boot
   */
  private async prefetchStockLocations(): Promise<boolean> {
    try {
      await this.stockLocationService.fetchStockLocations();
      return this.stockLocationService.locations().length > 0;
    } catch (error: any) {
      console.error('Failed to prefetch stock locations:', error);
      return false;
    }
  }

  /**
   * Clear all cached data (on logout or channel switch)
   */
  clearCache(): void {
    this.productCacheService.clearCache();
    this.mlModelService.unloadModel();
    this.stockLocationService.clearLocations();
    this.isInitializingSignal.set(false);
    this.lastInitChannelId.set(null);
    this.initStatusSignal.set({
      productsLoaded: false,
      modelLoaded: false,
      locationsLoaded: false,
      channelId: null,
      error: null,
    });
  }

  /**
   * Check if initialization is complete
   */
  isInitialized(): boolean {
    const status = this.initStatusSignal();
    return status.productsLoaded && status.channelId !== null;
  }

  /**
   * Check if ML features are available
   */
  isMLReady(): boolean {
    return this.initStatusSignal().modelLoaded;
  }
}

