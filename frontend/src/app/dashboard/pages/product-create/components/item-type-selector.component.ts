import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ItemType } from '../types/product-creation.types';

/**
 * Item Type Selector Component
 * 
 * Handles product vs service selection with clear visual distinction.
 * Simple presentational component with no business logic.
 */
@Component({
    selector: 'app-item-type-selector',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card bg-base-100 shadow">
            <div class="card-body p-3">
                <h3 class="font-bold text-sm">What are you adding?</h3>
                <div class="grid grid-cols-2 gap-2 mt-2">
                    <button
                        type="button"
                        class="btn btn-lg flex-col h-auto py-4"
                        [class.btn-primary]="itemType() === 'product'"
                        (click)="onItemTypeChange('product')"
                    >
                        <span class="text-2xl">📦</span>
                        <span class="text-sm">Physical Product</span>
                        <span class="text-xs opacity-60">Tracked inventory</span>
                    </button>

                    <button
                        type="button"
                        class="btn btn-lg flex-col h-auto py-4"
                        [class.btn-primary]="itemType() === 'service'"
                        (click)="onItemTypeChange('service')"
                    >
                        <span class="text-2xl">✨</span>
                        <span class="text-sm">Service</span>
                        <span class="text-xs opacity-60">Not tracked</span>
                    </button>
                </div>
            </div>
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

