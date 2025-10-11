import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

/**
 * Product Info Form Component
 * 
 * Simple component for product name and description.
 * Handles validation display and user feedback.
 */
@Component({
    selector: 'app-product-info-form',
    imports: [CommonModule, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card card-border bg-base-100" [formGroup]="form()">
            <div class="card-body">
                <h2 class="card-title">Product Information</h2>

                <!-- Product Name -->
                <label class="floating-label">
                    <input
                        type="text"
                        formControlName="name"
                        placeholder="Product Name"
                        class="input"
                        [class.input-error]="hasError('name')"
                    />
                    <span>Product Name *</span>
                </label>
                @if (hasError('name')) {
                    <p class="text-error text-sm mt-1">{{ getErrorMessage('name') }}</p>
                }

                <!-- Product Description -->
                <label class="floating-label mt-4">
                    <textarea
                        formControlName="description"
                        placeholder="Product Description"
                        class="textarea"
                        rows="3"
                        [class.textarea-error]="hasError('description')"
                    ></textarea>
                    <span>Product Description</span>
                </label>
                @if (hasError('description')) {
                    <p class="text-error text-sm mt-1">{{ getErrorMessage('description') }}</p>
                }
            </div>
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

