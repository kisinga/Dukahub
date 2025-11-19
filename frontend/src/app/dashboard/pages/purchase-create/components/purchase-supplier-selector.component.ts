import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Purchase Supplier Selector Component
 *
 * Reusable component for selecting a supplier in purchase forms.
 */
@Component({
  selector: 'app-purchase-supplier-selector',
  imports: [CommonModule],
  template: `
    <div class="form-control">
      <label class="label">
        <span class="label-text font-semibold">🏢 Supplier *</span>
      </label>
      <select
        class="select select-bordered w-full"
        [value]="selectedSupplierId() || ''"
        (change)="onSupplierChange($any($event.target).value || null)"
      >
        <option value="">Select supplier...</option>
        @for (supplier of suppliers(); track supplier.id) {
          <option [value]="supplier.id">
            {{ supplier.firstName }} {{ supplier.lastName }}
            @if (supplier.emailAddress) {
              ({{ supplier.emailAddress }})
            }
          </option>
        }
      </select>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseSupplierSelectorComponent {
  readonly suppliers = input.required<any[]>();
  readonly selectedSupplierId = input<string | null>(null);
  readonly supplierChange = output<string | null>();

  onSupplierChange(supplierId: string | null): void {
    this.supplierChange.emit(supplierId);
  }
}
