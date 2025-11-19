import { computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { CACHE_CONFIGS, CacheService } from '../cache.service';
import { CompanyService } from '../company.service';

/**
 * Base draft service for managing draft state with caching
 *
 * Provides reusable patterns for:
 * - State management with signals
 * - Channel-specific caching
 * - Auto-persistence on changes
 *
 * Follows LOB principle: single source of truth with local caching
 */
export abstract class DraftBaseService<T> {
  protected readonly cacheService = inject(CacheService);
  protected readonly companyService = inject(CompanyService);

  // State signals
  protected readonly draftSignal: WritableSignal<T | null>;
  protected readonly isLoadingSignal: WritableSignal<boolean>;
  protected readonly errorSignal: WritableSignal<string | null>;

  // Public readonly signals
  readonly draft: Signal<T | null>;
  readonly isLoading: Signal<boolean>;
  readonly error: Signal<string | null>;

  // Computed signals
  readonly hasDraft: Signal<boolean>;

  constructor(
    protected readonly cacheKey: string,
    protected readonly cacheConfig = CACHE_CONFIGS.CART,
  ) {
    // Initialize signals
    this.draftSignal = signal<T | null>(null);
    this.isLoadingSignal = signal<boolean>(false);
    this.errorSignal = signal<string | null>(null);

    // Expose as readonly
    this.draft = this.draftSignal.asReadonly();
    this.isLoading = this.isLoadingSignal.asReadonly();
    this.error = this.errorSignal.asReadonly();

    // Computed
    this.hasDraft = computed(() => this.draftSignal() !== null);
  }

  /**
   * Initialize draft (load from cache or create new)
   */
  initialize(): void {
    this.loadFromCache();
    if (!this.draftSignal()) {
      this.createNewDraft();
    }
  }

  /**
   * Create a new draft (must be implemented by subclass)
   */
  protected abstract createNew(): void;

  /**
   * Public method to create new draft (calls protected createNew)
   */
  createNewDraft(): void {
    this.createNew();
  }

  /**
   * Load draft from cache
   */
  protected loadFromCache(): void {
    const channelId = this.companyService.activeCompanyId();
    if (!channelId) {
      return;
    }

    const cached = this.cacheService.get<T>(this.cacheConfig, this.cacheKey, channelId);

    if (cached) {
      // Allow subclass to transform cached data (e.g., Date parsing)
      const transformed = this.transformCachedData(cached);
      this.draftSignal.set(transformed);
    }
  }

  /**
   * Transform cached data (e.g., parse Date strings)
   * Override in subclass if needed
   */
  protected transformCachedData(cached: T): T {
    return cached;
  }

  /**
   * Persist draft to cache
   */
  protected persist(): void {
    const channelId = this.companyService.activeCompanyId();
    if (!channelId) {
      return;
    }

    const draft = this.draftSignal();
    if (draft) {
      this.cacheService.set(this.cacheConfig, this.cacheKey, draft, channelId);
    }
  }

  /**
   * Clear draft and cache
   */
  clear(): void {
    this.draftSignal.set(null);
    this.clearCache();
  }

  /**
   * Clear cache
   */
  protected clearCache(): void {
    const channelId = this.companyService.activeCompanyId();
    if (!channelId) {
      return;
    }

    this.cacheService.remove(this.cacheConfig, this.cacheKey, channelId);
  }

  /**
   * Update draft field (protected, can be overridden)
   */
  protected updateField<K extends keyof T>(field: K, value: T[K]): void {
    const draft = this.draftSignal();
    if (!draft) {
      this.createNewDraft();
      return;
    }

    this.draftSignal.set({
      ...draft,
      [field]: value,
    });
    this.persist();
  }

  /**
   * Set loading state (public for orchestration services)
   */
  setLoading(loading: boolean): void {
    this.isLoadingSignal.set(loading);
  }

  /**
   * Set error state (public for orchestration services)
   */
  setError(error: string | null): void {
    this.errorSignal.set(error);
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.errorSignal.set(null);
  }
}
