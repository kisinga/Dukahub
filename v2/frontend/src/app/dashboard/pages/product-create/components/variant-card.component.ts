import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

/**
 * Variant Card Component
 * Reusable SKU form card for both auto-generated and custom variants
 */
@Component({
    selector: 'app-variant-card',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card card-border bg-base-100" [formGroup]="variantForm()">
            <div class="card-body">
                <!-- Header -->
                <div class="flex items-center justify-between mb-3">
                    @if (combinationLabel()) {
                    <div class="badge badge-primary">{{ combinationLabel() }}</div>
                    } @else {
                    <span class="text-sm font-medium">{{ headerLabel() || 'Custom SKU' }}</span>
                    }
                    <button
                        type="button"
                        (click)="removed.emit()"
                        class="btn btn-xs btn-circle btn-ghost"
                        [title]="'Remove ' + (combinationLabel() || 'SKU')"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Variant Name -->
                    <div class="md:col-span-2">
                        <label class="floating-label">
                            <input
                                type="text"
                                formControlName="name"
                                [placeholder]="namePlaceholder()"
                                class="input input-sm"
                                [class.input-error]="
                                    variantForm().get('name')?.invalid && variantForm().get('name')?.touched
                                "
                            />
                            <span>Variant Name *</span>
                        </label>
                        @if (variantForm().get('name')?.invalid && variantForm().get('name')?.touched) {
                        <p class="text-error text-xs mt-1">Variant name is required</p>
                        }
                    </div>

                    <!-- SKU Code -->
                    <div>
                        <label class="floating-label">
                            <input
                                type="text"
                                formControlName="sku"
                                [placeholder]="skuPlaceholder()"
                                class="input input-sm"
                                [class.input-error]="
                                    variantForm().get('sku')?.invalid && variantForm().get('sku')?.touched
                                "
                                maxlength="50"
                            />
                            <span>SKU *</span>
                        </label>
                        @if (variantForm().get('sku')?.invalid && variantForm().get('sku')?.touched) {
                        <p class="text-error text-xs mt-1">SKU is required</p>
                        }
                        <!-- Barcode Scanner Button -->
                        <button
                            type="button"
                            (click)="scanBarcodeClicked.emit()"
                            class="btn btn-xs btn-ghost mt-1"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                                />
                            </svg>
                            Scan Barcode
                        </button>
                    </div>

                    <!-- Price -->
                    <div>
                        <label class="floating-label">
                            <input
                                type="number"
                                formControlName="price"
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                class="input input-sm"
                                [class.input-error]="
                                    variantForm().get('price')?.invalid && variantForm().get('price')?.touched
                                "
                            />
                            <span>Price *</span>
                        </label>
                        @if (variantForm().get('price')?.invalid && variantForm().get('price')?.touched) {
                        <p class="text-error text-xs mt-1">Price must be greater than 0</p>
                        }
                    </div>

                    <!-- Stock Quantity -->
                    <div>
                        <label class="floating-label">
                            <input
                                type="number"
                                formControlName="stockOnHand"
                                placeholder="0"
                                min="0"
                                class="input input-sm"
                                [class.input-error]="
                                    variantForm().get('stockOnHand')?.invalid &&
                                    variantForm().get('stockOnHand')?.touched
                                "
                            />
                            <span>Initial Stock *</span>
                        </label>
                        @if (
                            variantForm().get('stockOnHand')?.invalid && variantForm().get('stockOnHand')?.touched
                        ) {
                        <p class="text-error text-xs mt-1">Stock must be 0 or greater</p>
                        }
                    </div>
                </div>
            </div>
        </div>
    `,
})
export class VariantCardComponent {
    // Inputs
    readonly variantForm = input.required<FormGroup>();
    readonly combinationLabel = input<string>('');
    readonly headerLabel = input<string>('');
    readonly namePlaceholder = input<string>('e.g., One Kilogram');
    readonly skuPlaceholder = input<string>('e.g., KG1');

    // Outputs
    readonly removed = output<void>();
    readonly scanBarcodeClicked = output<void>();
}
