import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SupplierService } from '../../../core/services/supplier.service';
import { PersonEditFormComponent } from '../shared/components/person-edit-form.component';

/**
 * Supplier Edit Component
 *
 * Mobile-optimized supplier editing form.
 * Uses shared PersonEditFormComponent for basic info and custom form for supplier details.
 *
 * ARCHITECTURE: Reuses shared form component for maintainability.
 */
@Component({
  selector: 'app-supplier-edit',
  imports: [CommonModule, ReactiveFormsModule, PersonEditFormComponent],
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
          <h1 class="text-lg font-semibold">Edit Supplier</h1>
          <div class="w-10"></div>
          <!-- Spacer for centering -->
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

        @if (isLoading()) {
          <div class="flex justify-center items-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
        } @else if (supplierData()) {
          <div class="space-y-6">
            <!-- Basic Information Section -->
            <div>
              <h2 class="text-lg font-semibold mb-3 px-1">Basic Information</h2>
              <app-person-edit-form
                [initialData]="supplierData()"
                [submitButtonText]="''"
                [isLoading]="false"
                (formSubmit)="onBasicInfoUpdate($event)"
              ></app-person-edit-form>
            </div>

            <!-- Supplier Details Section -->
            <div class="collapse collapse-arrow bg-base-100 border border-base-300 shadow-sm">
              <input type="checkbox" checked />
              <div class="collapse-title text-lg font-semibold px-4 py-3">🏭 Supplier Details</div>
              <div class="collapse-content px-4 pb-4">
                <p class="text-sm text-base-content/70 mb-4">
                  Update supplier-specific information
                </p>

                <form [formGroup]="supplierForm" class="space-y-4">
                  <!-- Supplier Type -->
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-semibold text-sm">🏭 Supplier Type</span>
                    </label>
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
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-semibold text-sm">👥 Contact Person</span>
                    </label>
                    <input
                      type="text"
                      formControlName="contactPerson"
                      placeholder="Primary contact person (optional)"
                      class="input input-bordered w-full"
                    />
                  </div>

                  <!-- Payment Terms -->
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-semibold text-sm">💳 Payment Terms</span>
                    </label>
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
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-semibold text-sm">📝 Notes</span>
                    </label>
                    <textarea
                      formControlName="notes"
                      placeholder="Additional notes about this supplier (optional)"
                      class="textarea textarea-bordered w-full h-24 resize-none"
                    ></textarea>
                  </div>
                </form>
              </div>
            </div>

            <!-- Submit Button -->
            <div class="sticky bottom-0 bg-base-100 pt-4 pb-2 border-t border-base-300 -mx-4 px-4">
              <button
                type="button"
                [disabled]="supplierService.isCreating()"
                (click)="onSupplierDetailsUpdate()"
                class="btn btn-primary w-full"
              >
                @if (supplierService.isCreating()) {
                  <span class="loading loading-spinner loading-sm"></span>
                  Updating Supplier...
                } @else {
                  Update Supplier
                }
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierEditComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  readonly supplierService = inject(SupplierService);

  // State
  readonly error = signal<string | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly supplierData = signal<any>(null);
  readonly basicFormData = signal<any>(null);
  readonly supplierForm: FormGroup;

  constructor() {
    // Supplier details form (all optional)
    this.supplierForm = this.fb.group({
      supplierType: [''],
      contactPerson: [''],
      paymentTerms: [''],
      notes: [''],
    });

    this.loadSupplier();
  }

  /**
   * Load supplier data for editing
   */
  async loadSupplier(): Promise<void> {
    try {
      const supplierId = this.route.snapshot.paramMap.get('id');
      if (!supplierId) {
        this.error.set('Supplier ID not provided');
        return;
      }

      const supplier = await this.supplierService.getSupplierById(supplierId);
      if (supplier) {
        this.supplierData.set({
          businessName: supplier.firstName || '',
          contactPerson: supplier.lastName || '',
          emailAddress: supplier.emailAddress || '',
          phoneNumber: supplier.phoneNumber || '',
        });

        // Populate supplier form with existing data
        const customFields = supplier.customFields || {};
        this.supplierForm.patchValue({
          supplierType: customFields.supplierType || '',
          contactPerson: customFields.contactPerson || '',
          paymentTerms: customFields.paymentTerms || '',
          notes: customFields.notes || '',
        });
      } else {
        this.error.set('Supplier not found');
      }
    } catch (err: any) {
      this.error.set(err.message || 'Failed to load supplier');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Handle basic info update
   */
  onBasicInfoUpdate(basicInfo: any): void {
    this.basicFormData.set(basicInfo);
    // Auto-save is handled by the submit button now
  }

  /**
   * Handle supplier details update
   */
  async onSupplierDetailsUpdate(): Promise<void> {
    this.error.set(null);

    try {
      const supplierId = this.route.snapshot.paramMap.get('id');
      if (!supplierId) {
        this.error.set('Supplier ID not provided');
        return;
      }

      // Map form data to backend format - only include basic fields at top level
      const basicData = this.basicFormData() || this.supplierData();
      const updateData: any = {
        firstName: basicData.businessName, // Business Name -> firstName
        lastName: basicData.contactPerson, // Contact Person -> lastName
        phoneNumber: basicData.phoneNumber,
        // Supplier-specific fields will be handled in customFields by the service
        supplierType: this.supplierForm.value.supplierType,
        contactPerson: this.supplierForm.value.contactPerson,
        paymentTerms: this.supplierForm.value.paymentTerms,
        notes: this.supplierForm.value.notes,
      };

      // Only include email if it's not empty
      if (basicData.emailAddress && basicData.emailAddress.trim()) {
        updateData.emailAddress = basicData.emailAddress.trim();
      }

      const success = await this.supplierService.updateSupplier(supplierId, updateData);

      if (success) {
        // Navigate back to suppliers list
        this.router.navigate(['/dashboard/suppliers']);
      } else {
        this.error.set(this.supplierService.error() || 'Failed to update supplier');
      }
    } catch (err: any) {
      this.error.set(err.message || 'Failed to update supplier');
    }
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
    this.router.navigate(['/dashboard/suppliers']);
  }
}
