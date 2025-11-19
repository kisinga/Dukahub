import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PurchaseLineItem } from '../../../../core/services/purchase.service.types';
import { StockLocation } from '../../../../core/services/stock-location.service';

/**
 * Purchase Line Items Table Component
 *
 * Reusable component for displaying and editing purchase line items.
 */
@Component({
  selector: 'app-purchase-line-items-table',
  imports: [CommonModule],
  template: `
    @if (lineItems().length > 0) {
      <div class="overflow-x-auto">
        <table class="table table-zebra table-sm">
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Unit Cost</th>
              <th>Total</th>
              <th>Location</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (line of lineItems(); track $index) {
              <tr>
                <td>{{ line.variant?.name || line.variantId }}</td>
                <td>
                  <input
                    type="number"
                    class="input input-xs w-20"
                    step="0.01"
                    min="0.01"
                    [value]="line.quantity"
                    (change)="
                      onLineItemUpdate($index, 'quantity', parseFloat($any($event.target).value))
                    "
                  />
                </td>
                <td>
                  <input
                    type="number"
                    class="input input-xs w-24"
                    step="0.01"
                    min="0"
                    [value]="line.unitCost"
                    (change)="
                      onLineItemUpdate($index, 'unitCost', parseFloat($any($event.target).value))
                    "
                  />
                </td>
                <td>{{ formatCurrency(line.quantity * line.unitCost) }}</td>
                <td>
                  <select
                    class="select select-xs"
                    [value]="line.stockLocationId"
                    (change)="
                      onLineItemUpdate($index, 'stockLocationId', $any($event.target).value)
                    "
                  >
                    @for (location of stockLocations(); track location.id) {
                      <option [value]="location.id">{{ location.name }}</option>
                    }
                  </select>
                </td>
                <td>
                  <button
                    type="button"
                    class="btn btn-xs btn-error"
                    (click)="onLineItemRemove($index)"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            }
          </tbody>
          <tfoot>
            <tr>
              <th colspan="3">Total</th>
              <th>{{ formatCurrency(totalCost()) }}</th>
              <th colspan="2"></th>
            </tr>
          </tfoot>
        </table>
      </div>
    } @else {
      <div class="text-center py-8 text-base-content/60">
        <div class="text-4xl mb-2">📦</div>
        <p>No items added yet</p>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseLineItemsTableComponent {
  readonly lineItems = input.required<PurchaseLineItem[]>();
  readonly stockLocations = input.required<StockLocation[]>();
  readonly totalCost = input.required<number>();

  readonly lineItemUpdate = output<{ index: number; field: keyof PurchaseLineItem; value: any }>();
  readonly lineItemRemove = output<number>();

  onLineItemUpdate(index: number, field: keyof PurchaseLineItem, value: any): void {
    this.lineItemUpdate.emit({ index, field, value });
  }

  onLineItemRemove(index: number): void {
    this.lineItemRemove.emit(index);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
    }).format(amount);
  }

  parseFloat(value: string | number): number {
    return parseFloat(String(value)) || 0;
  }
}
