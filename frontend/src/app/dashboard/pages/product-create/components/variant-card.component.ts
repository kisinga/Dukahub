import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

/**
 * Variant Card Component
 * Self-contained, reusable SKU form card with its own FormGroup binding.
 * Truly modular - can be used anywhere with proper form isolation.
 */
@Component({
    selector: 'app-variant-card',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card bg-base-100 shadow-sm border border-base-300" [formGroup]="variantForm()">
            <div class="card-body p-4">
                <!-- Header -->
                <div class="flex items-center justify-between mb-3">
                    @if (combinationLabel()) {
                    <span class="badge" [class.badge-primary]="!isCustom()" [class.badge-accent]="isCustom()">
                        {{ combinationLabel() }}
                    </span>
                    } @else {
                    <span class="text-sm font-semibold opacity-60">{{ headerLabel() || 'Manual' }}</span>
                    }
                    <button
                        type="button"
                        (click)="removed.emit()"
                        class="btn btn-sm btn-circle btn-ghost"
                        aria-label="Remove variant"
                    >
                        ✕
                    </button>
                </div>

                <!-- Form Grid -->
                <div class="space-y-3">
                    <!-- Variant Name -->
                    <div>
                        <label class="text-xs font-semibold opacity-70 mb-1 block">🏷️ Name</label>
                        <input
                            type="text"
                            formControlName="name"
                            [placeholder]="namePlaceholder()"
                            class="input input-sm input-bordered w-full"
                            [class.input-error]="variantForm().get('name')?.invalid && variantForm().get('name')?.touched"
                        />
                        @if (variantForm().get('name')?.invalid && variantForm().get('name')?.touched) {
                        <p class="text-error text-xs mt-0.5">Required</p>
                        }
                    </div>

                    <!-- SKU Code -->
                    <div>
                        <label class="text-xs font-semibold opacity-70 mb-1 block">🔖 SKU</label>
                        <input
                            type="text"
                            formControlName="sku"
                            [placeholder]="skuPlaceholder() || 'e.g., PROD-001'"
                            class="input input-sm input-bordered w-full"
                            [class.input-error]="variantForm().get('sku')?.invalid && variantForm().get('sku')?.touched"
                            maxlength="50"
                        />
                        @if (variantForm().get('sku')?.invalid && variantForm().get('sku')?.touched) {
                        <p class="text-error text-xs mt-0.5">Required</p>
                        }
                    </div>

                    <!-- 2-Column Grid: Price & Stock -->
                    <div class="grid grid-cols-2 gap-2">
                        <!-- Price -->
                        <div>
                            <label class="text-xs font-semibold opacity-70 mb-1 block">💵 Price</label>
                            <input
                                type="number"
                                formControlName="price"
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                class="input input-sm input-bordered w-full"
                                [class.input-error]="variantForm().get('price')?.invalid && variantForm().get('price')?.touched"
                            />
                            @if (variantForm().get('price')?.invalid && variantForm().get('price')?.touched) {
                            <p class="text-error text-xs mt-0.5">Required</p>
                            }
                        </div>

                        <!-- Stock Quantity -->
                        <div>
                            <label 
                                class="text-xs font-semibold opacity-70 mb-1 block cursor-help" 
                                title="Initial inventory quantity"
                            >
                                📦 Stock
                            </label>
                            <input
                                type="number"
                                formControlName="stockOnHand"
                                placeholder="0"
                                min="0"
                                class="input input-sm input-bordered w-full"
                                [class.input-error]="
                                    variantForm().get('stockOnHand')?.invalid && variantForm().get('stockOnHand')?.touched
                                "
                            />
                        </div>
                    </div>

                    <!-- Barcode Scanner (Optional) -->
                    <button
                        type="button"
                        (click)="scanBarcodeClicked.emit()"
                        class="btn btn-sm btn-ghost w-full gap-1"
                    >
                        📷 Scan Barcode
                    </button>
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
    readonly isCustom = input<boolean>(false);

    // Outputs
    readonly removed = output<void>();
    readonly scanBarcodeClicked = output<void>();
}
