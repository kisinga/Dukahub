import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  input,
  Output,
  signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SupplierService } from '../../../core/services/supplier.service';

/**
 * Supplier Create Component
 *
 * Mobile-optimized supplier creation form.
 * Two-step form: Basic info + Supplier-specific info.
 *
 * ARCHITECTURE: Every supplier is also a customer with additional fields.
 */
@Component({
  selector: 'app-supplier-create',
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
          <h1 class="text-lg font-semibold">Create Supplier</h1>
          <div class="w-10"></div>
          <!-- Spacer for centering -->
        </div>
      </div>

      <!-- Progress Indicator -->
      <div class="px-4 py-2 bg-base-200">
        <div class="flex items-center justify-center space-x-2 text-sm">
          <div class="flex items-center">
            <div
              [class]="
                'w-6 h-6 rounded-full flex items-center justify-center text-xs ' +
                (step() >= 1 ? 'bg-primary text-primary-content' : 'bg-base-300')
              "
            >
              1
            </div>
            <span class="ml-1">Basic Info</span>
          </div>
          <div class="w-8 h-px bg-base-300"></div>
          <div class="flex items-center">
            <div
              [class]="
                'w-6 h-6 rounded-full flex items-center justify-center text-xs ' +
                (step() >= 2 ? 'bg-primary text-primary-content' : 'bg-base-300')
              "
            >
              2
            </div>
            <span class="ml-1">Supplier Details</span>
          </div>
        </div>
      </div>

      <!-- Form Content -->
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

        <!-- Step 1: Basic Person Info -->
        @if (step() === 1) {
          <div class="mb-6">
            <h2 class="text-lg font-semibold mb-4">Basic Information</h2>
            <p class="text-sm text-base-content/70 mb-4">
              Enter the basic contact information for this supplier.
            </p>
          </div>

          <form
            [formGroup]="basicForm"
            (ngSubmit)="onBasicSubmit()"
            class="space-y-4 max-w-md mx-auto"
          >
            <!-- Business Name -->
            <div class="input-wrapper">
              <label class="text-sm font-semibold label-text mb-1 block">
                🏢 Business Name *
              </label>
              <input
                type="text"
                formControlName="businessName"
                placeholder="Enter business name"
                class="input input-bordered w-full"
                [class.input-error]="hasBasicError('businessName')"
                autofocus
              />
              @if (hasBasicError('businessName')) {
                <p class="text-error text-xs mt-1">{{ getBasicErrorMessage('businessName') }}</p>
              }
            </div>

            <!-- Contact Person -->
            <div class="input-wrapper">
              <label class="text-sm font-semibold label-text mb-1 block">
                👤 Contact Person *
              </label>
              <input
                type="text"
                formControlName="contactPerson"
                placeholder="Enter contact person name"
                class="input input-bordered w-full"
                [class.input-error]="hasBasicError('contactPerson')"
              />
              @if (hasBasicError('contactPerson')) {
                <p class="text-error text-xs mt-1">{{ getBasicErrorMessage('contactPerson') }}</p>
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
                [class.input-error]="hasBasicError('emailAddress')"
              />
              @if (hasBasicError('emailAddress')) {
                <p class="text-error text-xs mt-1">{{ getBasicErrorMessage('emailAddress') }}</p>
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
                [class.input-error]="hasBasicError('phoneNumber')"
              />
              @if (hasBasicError('phoneNumber')) {
                <p class="text-error text-xs mt-1">{{ getBasicErrorMessage('phoneNumber') }}</p>
              }
            </div>

            <!-- Submit Button -->
            <div class="pt-4">
              <button type="submit" [disabled]="basicForm.invalid" class="btn btn-primary w-full">
                Next: Supplier Details
              </button>
            </div>
          </form>
        }

        <!-- Step 2: Supplier Details -->
        @if (step() === 2) {
          <div class="mb-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold">Supplier Details</h2>
              <button (click)="goToStep(1)" class="btn btn-ghost btn-sm">Edit Basic Info</button>
            </div>
            <p class="text-sm text-base-content/70 mb-4">
              Add supplier-specific information (all fields are optional).
            </p>
          </div>

          <form
            [formGroup]="supplierForm"
            (ngSubmit)="onSupplierSubmit()"
            class="space-y-4 max-w-md mx-auto"
          >
            <!-- Supplier Type -->
            <div class="input-wrapper">
              <label class="text-sm font-semibold label-text mb-1 block"> 🏭 Supplier Type </label>
              <select formControlName="supplierType" class="select select-bordered w-full">
                <option value="">Select type (optional)</option>
                <option value="Manufacturer">Manufacturer</option>
                <option value="Distributor">Distributor</option>
                <option value="Wholesaler">Wholesaler</option>
                <option value="Retailer">Retailer</option>
                <option value="Service Provider">Service Provider</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <!-- Contact Person -->
            <div class="input-wrapper">
              <label class="text-sm font-semibold label-text mb-1 block"> 👥 Contact Person </label>
              <input
                type="text"
                formControlName="contactPerson"
                placeholder="Primary contact person (optional)"
                class="input input-bordered w-full"
              />
            </div>

            <!-- Payment Terms -->
            <div class="input-wrapper">
              <label class="text-sm font-semibold label-text mb-1 block"> 💳 Payment Terms </label>
              <select formControlName="paymentTerms" class="select select-bordered w-full">
                <option value="">Select payment terms (optional)</option>
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 60">Net 60</option>
                <option value="COD">Cash on Delivery</option>
                <option value="Prepaid">Prepaid</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <!-- Notes -->
            <div class="input-wrapper">
              <label class="text-sm font-semibold label-text mb-1 block"> 📝 Notes </label>
              <textarea
                formControlName="notes"
                placeholder="Additional notes about this supplier (optional)"
                class="textarea textarea-bordered w-full h-20 resize-none"
              ></textarea>
            </div>

            <!-- Submit Button -->
            <div class="pt-4">
              <button
                type="submit"
                [disabled]="supplierService.isCreating()"
                class="btn btn-primary w-full"
              >
                @if (supplierService.isCreating()) {
                  <span class="loading loading-spinner loading-sm"></span>
                  Creating Supplier...
                } @else {
                  Create Supplier
                }
              </button>
            </div>
          </form>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierCreateComponent {
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly supplierService = inject(SupplierService);

  // Inputs for composability
  readonly mode = input<'page' | 'modal'>('page');

  // Output for modal usage
  @Output() supplierCreated = new EventEmitter<string>();

  // State
  readonly step = signal<number>(1);
  readonly error = signal<string | null>(null);
  readonly basicForm: FormGroup;
  readonly supplierForm: FormGroup;

  constructor() {
    // Basic info form (required fields)
    this.basicForm = this.fb.group({
      businessName: ['', [Validators.required, Validators.minLength(2)]],
      contactPerson: ['', [Validators.required, Validators.minLength(2)]],
      emailAddress: ['', [Validators.email]], // Optional
      phoneNumber: ['', [Validators.required, Validators.pattern(/^07\d{8}$/)]], // Required, format: 07XXXXXXXX
    });

    // Supplier details form (all optional)
    this.supplierForm = this.fb.group({
      supplierType: [''],
      contactPerson: [''],
      paymentTerms: [''],
      notes: [''],
    });
  }

  /**
   * Handle basic info submission (Step 1)
   */
  onBasicSubmit(): void {
    if (this.basicForm.valid) {
      this.goToStep(2);
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.basicForm.controls).forEach((key) => {
        this.basicForm.get(key)?.markAsTouched();
      });
    }
  }

  /**
   * Handle supplier details submission (Step 2)
   */
  async onSupplierSubmit(): Promise<void> {
    this.error.set(null);

    try {
      // Map form data to backend format - only include basic fields at top level
      const supplierInput: any = {
        firstName: this.basicForm.value.businessName, // Business Name -> firstName
        lastName: this.basicForm.value.contactPerson, // Contact Person -> lastName
        phoneNumber: this.basicForm.value.phoneNumber,
        // Supplier-specific fields will be handled in customFields by the service
        supplierType: this.supplierForm.value.supplierType,
        contactPerson: this.supplierForm.value.contactPerson,
        paymentTerms: this.supplierForm.value.paymentTerms,
        notes: this.supplierForm.value.notes,
      };

      // Email is required by Vendure, use placeholder if not provided
      supplierInput.emailAddress =
        this.basicForm.value.emailAddress ||
        this.generatePlaceholderEmail(this.basicForm.value.businessName);

      const supplierId = await this.supplierService.createSupplier(supplierInput);

      if (supplierId) {
        // Emit event for modal usage
        this.supplierCreated.emit(supplierId);

        // Navigate only in page mode
        if (this.mode() === 'page') {
          this.router.navigate(['/dashboard/suppliers']);
        }
      } else {
        this.error.set(this.supplierService.error() || 'Failed to create supplier');
      }
    } catch (err: any) {
      this.error.set(err.message || 'Failed to create supplier');
    }
  }

  /**
   * Navigate between steps
   */
  goToStep(stepNumber: number): void {
    this.step.set(stepNumber);
    this.clearError();
  }

  /**
   * Check if basic form control has an error
   */
  hasBasicError(controlName: string, errorType?: string): boolean {
    const control = this.basicForm.get(controlName);
    if (!control) return false;

    if (errorType) {
      return control.hasError(errorType) && (control.dirty || control.touched);
    }
    return control.invalid && (control.dirty || control.touched);
  }

  /**
   * Get error message for basic form control
   */
  getBasicErrorMessage(controlName: string): string {
    const control = this.basicForm.get(controlName);
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
    this.supplierService.clearError();
  }

  /**
   * Navigate back
   */
  goBack(): void {
    if (this.step() === 2) {
      this.goToStep(1);
    } else {
      // Only navigate in page mode
      if (this.mode() === 'page') {
        this.router.navigate(['/dashboard/suppliers']);
      }
    }
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

    return `noemail-${sanitizedName}-${timestamp}@dukarun.local`;
  }
}
