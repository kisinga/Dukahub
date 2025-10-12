import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { FormArray } from '@angular/forms';
import { VariantListComponent } from './variant-list.component';

/**
 * Variant Details Section Component
 * 
 * Wraps the variant list with header and count badge.
 * 
 * Responsibilities:
 * - Display variant count
 * - Render variant list
 * - Pass through events
 * 
 * Pure presentation wrapper
 */
@Component({
    selector: 'app-variant-details-section',
    standalone: true,
    imports: [VariantListComponent],
    template: `
        @if (variants().length > 0) {
        <div class="card bg-base-100 shadow">
            <div class="card-body p-4">
                <!-- Header -->
                <div class="flex items-center justify-between mb-3">
                    <h3 class="font-bold">3️⃣ Variant Details</h3>
                    <span class="badge badge-primary">{{ variants().length }}</span>
                </div>
                <p class="text-sm opacity-70 mb-4">Fill details for each variant below ↓</p>

                <!-- Variant List -->
                <app-variant-list
                    [variants]="variants()"
                    [combinationLabels]="combinationLabels()"
                    [customVariantIndices]="customVariantIndices()"
                    (variantRemoved)="variantRemoved.emit($event)"
                    (barcodeRequested)="barcodeRequested.emit($event)"
                />
            </div>
        </div>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantDetailsSectionComponent {
    // Inputs
    readonly variants = input.required<FormArray>();
    readonly combinationLabels = input.required<string[]>();
    readonly customVariantIndices = input.required<number[]>();

    // Outputs
    readonly variantRemoved = output<number>();
    readonly barcodeRequested = output<number>();
}

