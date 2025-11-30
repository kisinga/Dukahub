import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { HowSoldPreset } from '../types/product-creation.types';

/**
 * How Sold Selector
 *
 * Lets the user pick how the item is sold. Clean grid with icons.
 */
@Component({
  selector: 'app-how-sold-selector',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-2">
      <h3 class="font-medium text-sm opacity-80">How is it sold?</h3>

      <div class="grid grid-cols-2 gap-2">
        <!-- Single item -->
        <button
          type="button"
          class="btn flex-col h-auto py-3"
          [class.btn-primary]="selected() === 'single-item'"
          [class.btn-outline]="selected() !== 'single-item'"
          (click)="onSelect('single-item')"
        >
          <span class="text-xl">📦</span>
          <span class="text-xs font-semibold">Single item</span>
          <span class="text-[10px] opacity-60">One variant</span>
        </button>

        <!-- Multiple variants -->
        <button
          type="button"
          class="btn flex-col h-auto py-3"
          [class.btn-primary]="selected() === 'multi-variant'"
          [class.btn-outline]="selected() !== 'multi-variant'"
          (click)="onSelect('multi-variant')"
        >
          <span class="text-xl">📊</span>
          <span class="text-xs font-semibold">Sizes / Packs</span>
          <span class="text-[10px] opacity-60">Multiple variants</span>
        </button>

        <!-- By weight -->
        <button
          type="button"
          class="btn flex-col h-auto py-3"
          [class.btn-primary]="selected() === 'by-weight-kg'"
          [class.btn-outline]="selected() !== 'by-weight-kg'"
          (click)="onSelect('by-weight-kg')"
        >
          <span class="text-xl">⚖️</span>
          <span class="text-xs font-semibold">By weight</span>
          <span class="text-[10px] opacity-60">KG, fractional</span>
        </button>

        <!-- By volume -->
        <button
          type="button"
          class="btn flex-col h-auto py-3"
          [class.btn-primary]="selected() === 'by-volume-litre'"
          [class.btn-outline]="selected() !== 'by-volume-litre'"
          (click)="onSelect('by-volume-litre')"
        >
          <span class="text-xl">🧴</span>
          <span class="text-xs font-semibold">By volume</span>
          <span class="text-[10px] opacity-60">Litres, fractional</span>
        </button>
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
