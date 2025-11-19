import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PurchaseDraft } from '../../../../core/services/purchase.service.types';

/**
 * Purchase Form Fields Component
 *
 * Reusable component for purchase metadata fields:
 * - Purchase date
 * - Reference number
 * - Payment status
 * - Notes
 */
@Component({
  selector: 'app-purchase-form-fields',
  imports: [CommonModule],
  template: `
    <!-- Purchase Date -->
    <div class="form-control">
      <label class="label">
        <span class="label-text font-semibold">📅 Purchase Date *</span>
      </label>
      <input
        type="date"
        class="input input-bordered w-full"
        [value]="formatDateForInput(draft().purchaseDate)"
        (change)="onDateChange($any($event.target).value)"
      />
    </div>

    <!-- Reference Number -->
    <div class="form-control">
      <label class="label">
        <span class="label-text font-semibold">🔖 Reference Number</span>
      </label>
      <input
        type="text"
        class="input input-bordered w-full"
        placeholder="Invoice/Reference number (optional)"
        [value]="draft().referenceNumber"
        (input)="onFieldChange('referenceNumber', $any($event.target).value)"
      />
    </div>

    <!-- Payment Status -->
    <div class="form-control">
      <label class="label">
        <span class="label-text font-semibold">💳 Payment Status *</span>
      </label>
      <select
        class="select select-bordered w-full"
        [value]="draft().paymentStatus"
        (change)="onFieldChange('paymentStatus', $any($event.target).value)"
      >
        <option value="pending">Pending</option>
        <option value="partial">Partial</option>
        <option value="paid">Paid</option>
      </select>
    </div>

    <!-- Notes -->
    <div class="form-control">
      <label class="label">
        <span class="label-text font-semibold">📝 Notes</span>
      </label>
      <textarea
        class="textarea textarea-bordered"
        placeholder="Additional notes (optional)"
        [value]="draft().notes"
        (input)="onFieldChange('notes', $any($event.target).value)"
      ></textarea>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseFormFieldsComponent {
  readonly draft = input.required<PurchaseDraft>();
  readonly fieldChange = output<{ field: keyof PurchaseDraft; value: any }>();

  onFieldChange(field: keyof PurchaseDraft, value: any): void {
    this.fieldChange.emit({ field, value });
  }

  onDateChange(dateString: string): void {
    const date = new Date(dateString);
    this.onFieldChange('purchaseDate', date);
  }

  formatDateForInput(date: Date): string {
    return new Date(date).toISOString().split('T')[0];
  }
}
