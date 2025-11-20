import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CustomerService } from '../../../core/services/customer.service';

/**
 * Customer Create Component
 *
 * Mobile-optimized customer creation form.
 * Uses shared PersonFormComponent for consistent UX.
 *
 * ARCHITECTURE: Simple form with minimal required fields.
 */
@Component({
  selector: 'app-customer-create',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-base-100">
      <!-- Header -->
      <div class="sticky top-0 z-10 bg-base-100 border-b border-base-200 px-4 py-3">
        <div class="flex items-center justify-between">
          <button (click)="goBack()" class="btn btn-ghost btn-sm btn-circle" aria-label="Go back">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              ></path>
            </svg>
          </button>
          <h1 class="text-lg font-semibold">Create Customer</h1>
          <div class="w-10"></div>
          <!-- Spacer for centering -->
        </div>
      </div>

      <!-- Form -->
      <div class="p-4">
        @if (error()) {
          <div class="alert alert-error mb-4">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <span>{{ error() }}</span>
            <button (click)="clearError()" class="btn btn-ghost btn-sm">×</button>
          </div>
        }

        <!-- Mobile-optimized form -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4 max-w-md mx-auto">
          <!-- Business Name -->
          <div class="input-wrapper">
            <label class="text-sm font-semibold label-text mb-1 block"> 🏢 Business Name * </label>
            <input
              type="text"
              formControlName="businessName"
              placeholder="Enter business name"
              class="input input-bordered w-full"
              [class.input-error]="hasError('businessName')"
              autofocus
            />
            @if (hasError('businessName')) {
              <p class="text-error text-xs mt-1">{{ getErrorMessage('businessName') }}</p>
            }
          </div>

          <!-- Contact Person -->
          <div class="input-wrapper">
            <label class="text-sm font-semibold label-text mb-1 block"> 👤 Contact Person * </label>
            <input
              type="text"
              formControlName="contactPerson"
              placeholder="Enter contact person name"
              class="input input-bordered w-full"
              [class.input-error]="hasError('contactPerson')"
            />
            @if (hasError('contactPerson')) {
              <p class="text-error text-xs mt-1">{{ getErrorMessage('contactPerson') }}</p>
            }
          </div>

          <!-- Email -->
          <div class="input-wrapper">
            <label class="text-sm font-semibold label-text mb-1 block"> 📧 Email Address </label>
            <input
              type="email"
              formControlName="emailAddress"
              placeholder="Enter email address (optional)"
              class="input input-bordered w-full"
              [class.input-error]="hasError('emailAddress')"
            />
            @if (hasError('emailAddress')) {
              <p class="text-error text-xs mt-1">{{ getErrorMessage('emailAddress') }}</p>
            }
          </div>

          <!-- Phone Number -->
          <div class="input-wrapper">
            <label class="text-sm font-semibold label-text mb-1 block"> 📱 Phone Number * </label>
            <input
              type="tel"
              formControlName="phoneNumber"
              placeholder="07XXXXXXXX (required)"
              class="input input-bordered w-full"
              [class.input-error]="hasError('phoneNumber')"
            />
            @if (hasError('phoneNumber')) {
              <p class="text-error text-xs mt-1">{{ getErrorMessage('phoneNumber') }}</p>
            }
          </div>

          <!-- Submit Button -->
          <div class="pt-4">
            <button
              type="submit"
              [disabled]="form.invalid || customerService.isCreating()"
              class="btn btn-primary w-full"
            >
              @if (customerService.isCreating()) {
                <span class="loading loading-spinner loading-sm"></span>
                Creating...
              } @else {
                Create Customer
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerCreateComponent {
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly customerService = inject(CustomerService);

  // State
  readonly error = signal<string | null>(null);
  readonly form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      businessName: ['', [Validators.required, Validators.minLength(2)]],
      contactPerson: ['', [Validators.required, Validators.minLength(2)]],
      emailAddress: ['', [Validators.email]], // Optional
      phoneNumber: ['', [Validators.required, Validators.pattern(/^07\d{8}$/)]], // Required, format: 07XXXXXXXX
    });
  }

  /**
   * Handle form submission
   */
  async onSubmit(): Promise<void> {
    if (this.form.valid) {
      this.error.set(null);

      try {
        // Map form data to backend format
        const customerData = {
          firstName: this.form.value.businessName, // Business Name -> firstName
          lastName: this.form.value.contactPerson, // Contact Person -> lastName
          emailAddress:
            this.form.value.emailAddress ||
            this.generatePlaceholderEmail(this.form.value.businessName),
          phoneNumber: this.form.value.phoneNumber,
        };

        const customerId = await this.customerService.createCustomer(customerData);

        if (customerId) {
          // Navigate back to customers list
          this.router.navigate(['/dashboard/customers']);
        } else {
          this.error.set(this.customerService.error() || 'Failed to create customer');
        }
      } catch (err: any) {
        this.error.set(err.message || 'Failed to create customer');
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.form.controls).forEach((key) => {
        this.form.get(key)?.markAsTouched();
      });
    }
  }

  /**
   * Check if a form control has an error
   */
  hasError(controlName: string, errorType?: string): boolean {
    const control = this.form.get(controlName);
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
    const control = this.form.get(controlName);
    if (!control || !control.errors) return '';

    const errors = control.errors;
    if (errors['required']) return 'This field is required';
    if (errors['minlength']) {
      return `Minimum ${errors['minlength'].requiredLength} characters required`;
    }
    if (errors['email']) return 'Please enter a valid email address';
    if (errors['pattern']) return 'Phone must be in format 07XXXXXXXX (10 digits starting with 07)';

    return 'Invalid value';
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
    this.customerService.clearError();
  }

  /**
   * Navigate back
   */
  goBack(): void {
    this.router.navigate(['/dashboard/customers']);
  }

  /**
   * Generate a unique placeholder email based on business name
   * Required by Vendure since emailAddress is mandatory
   */
  private generatePlaceholderEmail(businessName: string): string {
    // Create a sanitized version of the business name for email
    const sanitizedName = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric characters
      .substring(0, 15); // Limit length to keep email reasonable

    // Add timestamp to ensure uniqueness
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp

    return `noemail-${sanitizedName}-${timestamp}@dukahub.local`;
  }
}
