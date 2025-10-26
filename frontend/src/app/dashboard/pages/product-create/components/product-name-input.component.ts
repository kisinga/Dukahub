import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

/**
 * Product Name Input Component
 * 
 * Simple form control wrapper for product name input.
 * Handles validation display and styling.
 */
@Component({
    selector: 'app-product-name-input',
    imports: [CommonModule, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card bg-base-100 shadow">
            <div class="card-body p-3">
                <h3 class="font-bold text-sm mb-2">Product Name</h3>
                <input
                    type="text"
                    [formControl]="nameControl()"
                    placeholder="e.g., Tomatoes, Haircut, Coca Cola"
                    class="input input-bordered w-full"
                    [class.input-error]="nameControl().invalid && nameControl().touched"
                />
                @if (nameControl().invalid && nameControl().touched) {
                    <label class="label">
                        <span class="label-text-alt text-error">Product name is required</span>
                    </label>
                }
            </div>
        </div>
    `,
})
export class ProductNameInputComponent {
    // Inputs
    readonly nameControl = input.required<FormControl>();
}

