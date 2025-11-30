import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ItemType } from '../types/product-creation.types';

/**
 * Item Type Selector Component
 *
 * Clean segment control for product vs service.
 */
@Component({
  selector: 'app-item-type-selector',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="join w-full bg-base-200 p-1 rounded-lg">
      <button
        type="button"
        class="btn join-item flex-1 flex-col h-auto py-3 gap-1"
        [class.btn-primary]="itemType() === 'product'"
        [class.btn-ghost]="itemType() !== 'product'"
        (click)="onItemTypeChange('product')"
      >
        <span class="text-2xl">📦</span>
        <span class="text-sm font-semibold">Product</span>
        <span class="text-xs opacity-60">Tracked stock</span>
      </button>

      <button
        type="button"
        class="btn join-item flex-1 flex-col h-auto py-3 gap-1"
        [class.btn-primary]="itemType() === 'service'"
        [class.btn-ghost]="itemType() !== 'service'"
        (click)="onItemTypeChange('service')"
      >
        <span class="text-2xl">✨</span>
        <span class="text-sm font-semibold">Service</span>
        <span class="text-xs opacity-60">No stock</span>
      </button>
    </div>
  `,
})
export class ItemTypeSelectorComponent {
  // Inputs
  readonly itemType = input.required<ItemType>();

  // Outputs
  readonly itemTypeChange = output<ItemType>();

  /**
   * Handle item type selection
   */
  onItemTypeChange(type: ItemType): void {
    this.itemTypeChange.emit(type);
  }
}
