import { Injectable, computed, inject } from '@angular/core';
import { PurchaseDraftService } from './draft/purchase-draft.service';
import { PurchaseValidationService } from './purchase/purchase-validation.service';
import { PurchaseApiService } from './purchase/purchase-api.service';
import { PurchaseDraft, PurchaseLineItem } from './purchase.service.types';

/**
 * Purchase Service
 * 
 * Orchestrates purchase recording by composing focused services.
 * Follows composable service pattern: thin orchestration layer.
 * 
 * ARCHITECTURE:
 * - DraftService: Manages draft state and caching
 * - ValidationService: Handles validation logic
 * - ApiService: Handles API communication
 * - PurchaseService: Orchestrates the above
 */
@Injectable({
    providedIn: 'root',
})
export class PurchaseService {
    private readonly draftService = inject(PurchaseDraftService);
    private readonly validationService = inject(PurchaseValidationService);
    private readonly apiService = inject(PurchaseApiService);

    // Expose draft service signals
    readonly purchaseDraft = this.draftService.draft;
    readonly isLoading = this.draftService.isLoading;
    readonly error = this.draftService.error;
    readonly hasDraft = this.draftService.hasDraft;

    // Computed signals
    readonly totalCost = computed(() => {
        const draft = this.purchaseDraft();
        if (!draft) return 0;
        return draft.lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0);
    });
    readonly lineCount = computed(() => {
        const draft = this.purchaseDraft();
        return draft?.lines.length || 0;
    });

    /**
     * Initialize purchase draft (load from cache or create new)
     */
    initializeDraft(): void {
        this.draftService.initialize();
    }

    /**
     * Create a new purchase draft
     */
    createNewDraft(): void {
        this.draftService.createNewDraft();
    }

    /**
     * Update purchase draft fields
     */
    updateDraftField<K extends keyof PurchaseDraft>(
        field: K,
        value: PurchaseDraft[K]
    ): void {
        this.draftService.updateField(field, value);
    }

    /**
     * Add item to local purchase draft
     */
    addPurchaseItemLocal(item: PurchaseLineItem): void {
        this.draftService.addLineItem(item);
    }

    /**
     * Remove item from draft
     */
    removePurchaseItemLocal(index: number): void {
        this.draftService.removeLineItem(index);
    }

    /**
     * Update purchase item
     */
    updatePurchaseItemLocal(index: number, updates: Partial<PurchaseLineItem>): void {
        this.draftService.updateLineItem(index, updates);
    }

    /**
     * Clear purchase draft
     */
    clearPurchaseDraft(): void {
        this.draftService.clear();
    }

    /**
     * Submit purchase to backend
     */
    async submitPurchase(): Promise<any> {
        const draft = this.purchaseDraft();
        
        // Validate draft
        const validation = this.validationService.validateDraft(draft);
        if (!validation.isValid) {
            const error = validation.error || 'Invalid purchase draft';
            this.draftService.setError(error);
            throw new Error(error);
        }

        this.draftService.setLoading(true);
        this.draftService.clearError();

        try {
            const result = await this.apiService.recordPurchase(draft!);

            // Clear draft on success
            this.draftService.clear();

            return result;
        } catch (error: any) {
            const errorMessage = error?.message || 'Failed to submit purchase';
            this.draftService.setError(errorMessage);
            throw error;
        } finally {
            this.draftService.setLoading(false);
        }
    }

    /**
     * Clear error state
     */
    clearError(): void {
        this.draftService.clearError();
    }
}
