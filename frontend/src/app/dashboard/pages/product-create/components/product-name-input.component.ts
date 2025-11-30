import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

/**
 * Product Name Input Component
 *
 * Minimal floating-label style input for product name.
 */
@Component({
  selector: 'app-product-name-input',
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="floating-label w-full">
      <input
        type="text"
        [formControl]="nameControl()"
        placeholder=" "
        class="input input-bordered w-full text-base"
        [class.input-error]="nameControl().invalid && nameControl().touched"
      />
      <span>Product name</span>
    </label>
    @if (nameControl().invalid && nameControl().touched) {
      <p class="text-xs text-error mt-1 ml-1">Name is required</p>
    }
  `,
})
export class ProductNameInputComponent {
  // Inputs
  readonly nameControl = input.required<FormControl>();
}
