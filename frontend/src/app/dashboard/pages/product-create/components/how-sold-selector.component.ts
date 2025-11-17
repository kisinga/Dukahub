import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { HowSoldPreset } from '../types/product-creation.types';

/**
 * How Sold Selector
 *
 * Step 1 of the 2-stage flow: lets the user pick a high-level pattern
 * for how the item is sold. This drives sensible defaults for variants.
 */
@Component({
    selector: 'app-how-sold-selector',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card bg-base-100 shadow">
            <div class="card-body p-3 space-y-3">
                <div class="flex items-center justify-between">
                    <h3 class="font-bold text-sm">How is this sold?</h3>
                    <span class="text-[10px] uppercase tracking-wide opacity-60">Step 1 of 2</span>
                </div>
                <p class="text-xs opacity-60">
                    Choose the option that best matches how customers buy this item. You can fine-tune details in the next step.
                </p>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <!-- Single item -->
                    <button
                        type="button"
                        class="btn btn-sm justify-start h-auto py-2 px-3 text-left"
                        [class.btn-primary]="selected() === 'single-item'"
                        [class.btn-outline]="selected() !== 'single-item'"
                        (click)="onSelect('single-item')"
                    >
                        <div>
                            <div class="font-semibold text-xs">Single item</div>
                            <div class="text-[11px] opacity-70">
                                One SKU only (e.g. one size or pack).
                            </div>
                        </div>
                    </button>

                    <!-- Multiple variants -->
                    <button
                        type="button"
                        class="btn btn-sm justify-start h-auto py-2 px-3 text-left"
                        [class.btn-primary]="selected() === 'multi-variant'"
                        [class.btn-outline]="selected() !== 'multi-variant'"
                        (click)="onSelect('multi-variant')"
                    >
                        <div>
                            <div class="font-semibold text-xs">Different sizes / packs</div>
                            <div class="text-[11px] opacity-70">
                                Multiple SKUs (e.g. Small / Large, Single / Carton).
                            </div>
                        </div>
                    </button>

                    <!-- By weight -->
                    <button
                        type="button"
                        class="btn btn-sm justify-start h-auto py-2 px-3 text-left"
                        [class.btn-primary]="selected() === 'by-weight-kg'"
                        [class.btn-outline]="selected() !== 'by-weight-kg'"
                        (click)="onSelect('by-weight-kg')"
                    >
                        <div>
                            <div class="font-semibold text-xs">By weight (KG)</div>
                            <div class="text-[11px] opacity-70">
                                Sold by weight with fractional quantities.
                            </div>
                        </div>
                    </button>

                    <!-- By volume -->
                    <button
                        type="button"
                        class="btn btn-sm justify-start h-auto py-2 px-3 text-left"
                        [class.btn-primary]="selected() === 'by-volume-litre'"
                        [class.btn-outline]="selected() !== 'by-volume-litre'"
                        (click)="onSelect('by-volume-litre')"
                    >
                        <div>
                            <div class="font-semibold text-xs">By volume (L)</div>
                            <div class="text-[11px] opacity-70">
                                Sold by volume with fractional quantities.
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    `,
})
export class HowSoldSelectorComponent {
    readonly selected = input<HowSoldPreset | null>(null);
    readonly selectedChange = output<HowSoldPreset>();

    onSelect(preset: HowSoldPreset): void {
        this.selectedChange.emit(preset);
    }
}


