import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { VariantCardComponent } from './variant-card.component';

/**
 * Variant List Component
 * Container component that manages a FormArray of variants.
 * Handles iteration and passes individual FormGroups to variant cards.
 * 
 * Responsibilities:
 * - Iterate over variants FormArray
 * - Pass individual FormGroup to each variant-card
 * - Handle variant removal events
 * - Display empty state
 */
@Component({
    selector: 'app-variant-list',
    standalone: true,
    imports: [CommonModule, VariantCardComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="space-y-3">
            @if (variants().length === 0) {
                <!-- Empty State -->
                <div class="text-center py-8 opacity-50">
                    <p class="text-sm">No variants yet</p>
                    <p class="text-xs mt-1">Select options above or add custom variants</p>
                </div>
            } @else {
                <!-- Variant Cards -->
                @for (control of variants().controls; track $index; let i = $index) {
                    <app-variant-card
                        [variantForm]="getVariantFormGroup(i)"
                        [combinationLabel]="getCombinationLabel(i)"
                        [headerLabel]="getHeaderLabel(i)"
                        [isCustom]="getIsCustom(i)"
                        (removed)="variantRemoved.emit(i)"
                        (scanBarcodeClicked)="barcodeRequested.emit(i)"
                    />
                }
            }
        </div>
    `,
})
export class VariantListComponent {
    // Inputs
    readonly variants = input.required<FormArray>();
    readonly combinationLabels = input<string[]>([]);
    readonly customVariantIndices = input<number[]>([]);

    // Outputs
    readonly variantRemoved = output<number>();
    readonly barcodeRequested = output<number>();

    /**
     * Get FormGroup at specific index (type-safe)
     */
    getVariantFormGroup(index: number): FormGroup {
        return this.variants().at(index) as FormGroup;
    }

    /**
     * Get combination label for variant
     */
    getCombinationLabel(index: number): string {
        const labels = this.combinationLabels();
        return labels[index] || '';
    }

    /**
     * Get header label for custom variants
     */
    getHeaderLabel(index: number): string {
        const variant = this.variants().at(index);
        const optionIds = variant.get('optionIds')?.value || [];
        return optionIds.length === 0 ? 'Custom' : '';
    }

    /**
     * Check if variant is custom
     */
    getIsCustom(index: number): boolean {
        return this.customVariantIndices().includes(index);
    }
}

