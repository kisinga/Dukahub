import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

/**
 * Service Form Component
 * 
 * Form for creating services (non-inventory items).
 * Includes name, description, price, and optional duration.
 */
@Component({
    selector: 'app-service-form',
    imports: [CommonModule, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="grid gap-6">
            <!-- Service Information Card -->
            <div class="card card-border bg-base-100" [formGroup]="form()">
                <div class="card-body">
                    <h2 class="card-title">Service Information</h2>
                    <p class="text-sm text-base-content/70 mb-4">
                        Services are offerings that don't require inventory tracking
                    </p>

                    <!-- Service Name -->
                    <label class="floating-label">
                        <input
                            type="text"
                            formControlName="name"
                            placeholder="Service Name"
                            class="input"
                            [class.input-error]="hasError('name')"
                        />
                        <span>Service Name *</span>
                    </label>
                    @if (hasError('name')) {
                        <p class="text-error text-sm mt-1">
                            @if (hasErrorType('name', 'required')) {
                                Service name required
                            } @else if (hasErrorType('name', 'minlength')) {
                                Minimum 3 characters required
                            }
                        </p>
                    }

                    <!-- Service Description -->
                    <label class="floating-label mt-4">
                        <textarea
                            formControlName="description"
                            placeholder="Service Description"
                            class="textarea"
                            rows="4"
                            [class.textarea-error]="hasError('description')"
                        ></textarea>
                        <span>Service Description *</span>
                    </label>
                    @if (hasError('description')) {
                        <p class="text-error text-sm mt-1">
                            @if (hasErrorType('description', 'required')) {
                                Description is required
                            } @else if (hasErrorType('description', 'minlength')) {
                                Minimum 10 characters required
                            }
                        </p>
                    }
                </div>
            </div>

            <!-- Pricing Card -->
            <div class="card card-border bg-base-100" [formGroup]="form()">
                <div class="card-body">
                    <h2 class="card-title">Pricing & Duration</h2>

                    <div class="grid sm:grid-cols-2 gap-4">
                        <!-- Price -->
                        <label class="floating-label">
                            <input
                                type="number"
                                formControlName="price"
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                class="input"
                                [class.input-error]="hasError('price')"
                            />
                            <span>Price (KES) *</span>
                        </label>
                        @if (hasError('price')) {
                            <p class="text-error text-sm mt-1">
                                @if (hasErrorType('price', 'required')) {
                                    Price is required
                                } @else if (hasErrorType('price', 'min')) {
                                    Price must be greater than 0
                                }
                            </p>
                        }

                        <!-- Duration (Optional) -->
                        <label class="floating-label">
                            <input
                                type="number"
                                formControlName="duration"
                                placeholder="0"
                                min="0"
                                class="input"
                            />
                            <span>Duration (minutes, optional)</span>
                        </label>
                    </div>

                    <div role="alert" class="alert alert-info mt-4">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <span class="text-sm">
                            Duration helps with scheduling and estimating service completion time
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export class ServiceFormComponent {
    // Input
    readonly form = input.required<FormGroup>();

    /**
     * Check if a form control has an error
     */
    hasError(controlName: string): boolean {
        const control = this.form().get(controlName);
        if (!control) return false;
        return control.invalid && (control.dirty || control.touched);
    }

    /**
     * Check if a control has a specific error type
     */
    hasErrorType(controlName: string, errorType: string): boolean {
        const control = this.form().get(controlName);
        if (!control) return false;
        return control.hasError(errorType);
    }
}

