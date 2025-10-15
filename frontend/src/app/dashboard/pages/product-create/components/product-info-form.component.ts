import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

/**
 * Product/Service Info Form Component
 * 
 * Reusable form for product and service basic info.
 * Shows price field for services, hides it for products.
 * Description is hidden by default (optional).
 */
@Component({
    selector: 'app-product-info-form',
    imports: [CommonModule, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        .input-wrapper:focus-within .label-text {
            color: oklch(var(--p));
        }
    `],
    template: `
        <div [formGroup]="form()" class="space-y-3">
            <!-- Name -->
            <div class="input-wrapper">
                <label
                    class="text-sm font-semibold label-text mb-1 block cursor-help"
                    title="Short, descriptive name"
                >
                    📦 Name
                </label>
                <input
                    type="text"
                    formControlName="name"
                    placeholder="e.g., Coca Cola 500ml"
                    class="input input-bordered w-full"
                    [class.input-error]="hasError('name')"
                    autofocus
                />
                @if (hasError('name')) {
                    <p class="text-error text-xs mt-1">{{ getErrorMessage('name') }}</p>
                }
            </div>

            <!-- Price (for services only) -->
            @if (form().get('price')) {
            <div class="input-wrapper">
                <label class="text-sm font-semibold label-text mb-1 block">💵 Price</label>
                <input
                    type="number"
                    formControlName="price"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    class="input input-bordered w-full"
                    [class.input-error]="hasError('price')"
                />
                @if (hasError('price')) {
                    <p class="text-error text-xs mt-1">{{ getErrorMessage('price') }}</p>
                }
            </div>
            }
        </div>
    `,
})
export class ProductInfoFormComponent {
    // Input
    readonly form = input.required<FormGroup>();

    /**
     * Check if a form control has an error
     */
    hasError(controlName: string, errorType?: string): boolean {
        const control = this.form().get(controlName);
        if (!control) return false;

        if (errorType) {
            return control.hasError(errorType) && (control.dirty || control.touched);
        }
        return control.invalid && (control.dirty || control.touched);
    }

    /**
     * Get error message for a form control
     */
    getErrorMessage(controlName: string): string {
        const control = this.form().get(controlName);
        if (!control || !control.errors) return '';

        const errors = control.errors;
        if (errors['required']) return 'This field is required';
        if (errors['minlength']) {
            return `Minimum ${errors['minlength'].requiredLength} characters required`;
        }
        if (errors['pattern']) return 'Invalid format';

        return 'Invalid value';
    }
}

