import { Injectable, inject, signal } from '@angular/core';
import { CompanyService } from './company.service';
import { MlModelService } from './ml-model.service';
import { ProductCacheService } from './product-cache.service';

/**
 * Initialization status for dashboard boot
 */
export interface InitStatus {
  productsLoaded: boolean;
  modelLoaded: boolean;
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

  private readonly initStatusSignal = signal<InitStatus>({
    productsLoaded: false,
    modelLoaded: false,
    channelId: null,
    error: null,
  });

  readonly initStatus = this.initStatusSignal.asReadonly();

  /**
   * Initialize dashboard data when channel is set
   * Pre-fetches products and ML model for offline operation
   */
  async initializeDashboard(channelId: string): Promise<void> {
    console.log(`🚀 Initializing dashboard for channel ${channelId}...`);

    this.initStatusSignal.update((s) => ({ ...s, channelId, error: null }));

    // Run prefetch operations in parallel for faster boot
    const [productsSuccess, modelSuccess] = await Promise.allSettled([
      this.prefetchProducts(channelId),
      this.prefetchModel(channelId),
    ]);

    // Update status based on results
    this.initStatusSignal.update((s) => ({
      ...s,
      productsLoaded: productsSuccess.status === 'fulfilled' && productsSuccess.value,
      modelLoaded: modelSuccess.status === 'fulfilled' && modelSuccess.value,
      error:
        productsSuccess.status === 'rejected' || modelSuccess.status === 'rejected'
          ? 'Some features failed to initialize'
          : null,
    }));

    const status = this.initStatusSignal();
    if (status.productsLoaded && status.modelLoaded) {
      console.log('✅ Dashboard fully initialized (offline-capable)');
    } else if (status.productsLoaded) {
      console.log('⚠️ Dashboard initialized (camera scanning unavailable)');
    } else {
      console.error('❌ Dashboard initialization incomplete');
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
   * Clear all cached data (on logout or channel switch)
   */
  clearCache(): void {
    this.productCacheService.clearCache();
    this.mlModelService.unloadModel();
    this.initStatusSignal.set({
      productsLoaded: false,
      modelLoaded: false,
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

