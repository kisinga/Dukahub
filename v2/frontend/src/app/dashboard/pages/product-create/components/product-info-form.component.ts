import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

/**
 * Product/Service Info Form Component
 * 
 * Reusable form for product and service basic info.
 * Shows price field for services, hides it for products.
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
                    placeholder="e.g., Blue Jeans XL"
                    class="input input-bordered w-full"
                    [class.input-error]="hasError('name')"
                />
                @if (hasError('name')) {
                    <p class="text-error text-xs mt-1">{{ getErrorMessage('name') }}</p>
                }
            </div>

            <!-- Description -->
            <div class="input-wrapper">
                <div class="flex items-center gap-2 mb-1">
                    <label class="text-sm font-semibold label-text">📝 Description</label>
                    <span class="text-xs opacity-60">(optional)</span>
                </div>
                <textarea
                    formControlName="description"
                    placeholder="Additional details..."
                    class="textarea textarea-bordered w-full"
                    rows="2"
                    [class.textarea-error]="hasError('description')"
                ></textarea>
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

