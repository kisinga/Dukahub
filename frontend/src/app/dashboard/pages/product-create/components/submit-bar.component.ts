import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ItemType } from '../types/product-creation.types';

/**
 * Submit Bar Component
 *
 * Sticky submit button with loading state and status messages.
 * Handles all submission-related UI feedback.
 */
@Component({
  selector: 'app-submit-bar',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sticky bottom-4 bg-base-100 p-4 rounded-lg shadow-lg border">
      <button
        type="button"
        class="btn btn-primary w-full"
        [class.btn-disabled]="!canSubmit()"
        [class.loading]="isLoading()"
        (click)="onSubmit()"
      >
        @if (isLoading()) {
          <span class="loading loading-spinner loading-sm"></span>
          Creating...
        } @else {
          @if (isEditMode()) {
            Update Product
          } @else {
            Create {{ itemType() === 'service' ? 'Service' : 'Product' }}
          }
        }
      </button>

      @if (submitError()) {
        <div class="alert alert-error mt-2 text-xs flex items-center gap-2">
          <span class="material-symbols-outlined text-sm">error</span>
          <span>{{ submitError() }}</span>
        </div>
      }

      @if (submitSuccess()) {
        <div class="alert alert-success mt-2 text-xs flex items-center gap-2">
          <span class="material-symbols-outlined text-sm">check_circle</span>
          <span>Product created successfully.</span>
        </div>
      }
    </div>
  `,
})
export class SubmitBarComponent {
  // Inputs
  readonly canSubmit = input.required<boolean>();
  readonly isLoading = input.required<boolean>();
  readonly isEditMode = input.required<boolean>();
  readonly itemType = input.required<ItemType>();
  readonly submitError = input<string | null>(null);
  readonly submitSuccess = input<boolean>(false);

  // Outputs
  readonly submit = output<void>();

  /**
   * Handle submit button click
   */
  onSubmit(): void {
    this.submit.emit();
  }
}
