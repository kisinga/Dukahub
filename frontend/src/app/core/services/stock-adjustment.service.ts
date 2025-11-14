import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { StockAdjustmentDraftService } from './draft/stock-adjustment-draft.service';
import { StockAdjustmentValidationService } from './stock-adjustment/stock-adjustment-validation.service';
import { StockAdjustmentApiService } from './stock-adjustment/stock-adjustment-api.service';
import { StockAdjustmentDraft, StockAdjustmentLineItem } from './stock-adjustment.service.types';

/**
 * Stock Adjustment Service
 * 
 * Orchestrates stock adjustments by composing focused services.
 * Requires ManageStockAdjustmentsPermission.
 * Follows composable service pattern: thin orchestration layer.
 * 
 * ARCHITECTURE:
 * - DraftService: Manages draft state and caching
 * - ValidationService: Handles validation logic
 * - ApiService: Handles API communication
 * - StockAdjustmentService: Orchestrates the above
 */
@Injectable({
    providedIn: 'root',
})
export class StockAdjustmentService {
    private readonly draftService = inject(StockAdjustmentDraftService);
    private readonly validationService = inject(StockAdjustmentValidationService);
    private readonly apiService = inject(StockAdjustmentApiService);
    private readonly authService = inject(AuthService);

    // Expose draft service signals
    readonly adjustmentDraft = this.draftService.draft;
    readonly isLoading = this.draftService.isLoading;
    readonly error = this.draftService.error;
    readonly hasDraft = this.draftService.hasDraft;

    // Permission check
    readonly hasPermission = computed(() => this.authService.hasManageStockAdjustmentsPermission());

    // Computed signals
    readonly lineCount = computed(() => {
        const draft = this.adjustmentDraft();
        return draft?.lines.length || 0;
    });

    /**
     * Initialize adjustment draft (load from cache or create new)
     */
    initializeDraft(): void {
        if (!this.hasPermission()) {
            return;
        }
        this.draftService.initialize();
    }

    /**
     * Create a new adjustment draft
     */
    createNewDraft(): void {
        if (!this.hasPermission()) {
            throw new Error('You do not have permission to make stock adjustments');
        }
        this.draftService.createNewDraft();
    }

    /**
     * Update adjustment draft fields
     */
    updateDraftField<K extends keyof StockAdjustmentDraft>(
        field: K,
        value: StockAdjustmentDraft[K]
    ): void {
        if (!this.hasPermission()) {
            throw new Error('You do not have permission to make stock adjustments');
        }
        this.draftService.updateField(field, value);
    }

    /**
     * Add item to local adjustment draft
     */
    addAdjustmentItemLocal(item: StockAdjustmentLineItem): void {
        if (!this.hasPermission()) {
            throw new Error('You do not have permission to make stock adjustments');
        }
        this.draftService.addLineItem(item);
    }

    /**
     * Remove item from draft
     */
    removeAdjustmentItemLocal(index: number): void {
        this.draftService.removeLineItem(index);
    }

    /**
     * Update adjustment item
     */
    updateAdjustmentItemLocal(index: number, updates: Partial<StockAdjustmentLineItem>): void {
        this.draftService.updateLineItem(index, updates);
    }

    /**
     * Clear adjustment draft
     */
    clearAdjustmentDraft(): void {
        this.draftService.clear();
    }

    /**
     * Submit stock adjustment to backend
     */
    async submitStockAdjustment(): Promise<any> {
        if (!this.hasPermission()) {
            throw new Error('You do not have permission to make stock adjustments');
        }

        const draft = this.adjustmentDraft();

        // Validate draft
        const validation = this.validationService.validateDraft(draft);
        if (!validation.isValid) {
            const error = validation.error || 'Invalid adjustment draft';
            this.draftService.setError(error);
            throw new Error(error);
        }

        this.draftService.setLoading(true);
        this.draftService.clearError();

        try {
            const result = await this.apiService.recordStockAdjustment(draft!);

            // Clear draft on success
            this.draftService.clear();

            return result;
        } catch (error: any) {
            const errorMessage = error?.message || 'Failed to submit stock adjustment';
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
