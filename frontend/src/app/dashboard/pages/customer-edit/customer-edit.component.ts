import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomerService } from '../../../core/services/customer.service';
import { PersonEditFormComponent } from '../shared/components/person-edit-form.component';

/**
 * Customer Edit Component
 * 
 * Mobile-optimized customer editing form.
 * Uses shared PersonEditFormComponent for consistent UX.
 * 
 * ARCHITECTURE: Reuses shared form component for maintainability.
 */
@Component({
  selector: 'app-customer-edit',
  imports: [CommonModule, PersonEditFormComponent],
  template: `
    <div class="min-h-screen bg-base-100">
      <!-- Header -->
      <div class="sticky top-0 z-10 bg-base-100 border-b border-base-200 px-4 py-3">
        <div class="flex items-center justify-between">
          <button 
            (click)="goBack()" 
            class="btn btn-ghost btn-sm btn-circle"
            aria-label="Go back"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
          <h1 class="text-lg font-semibold">Edit Customer</h1>
          <div class="w-10"></div> <!-- Spacer for centering -->
        </div>
      </div>

      <!-- Form -->
      <div class="p-4">
        @if (error()) {
          <div class="alert alert-error mb-4">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>{{ error() }}</span>
            <button (click)="clearError()" class="btn btn-ghost btn-sm">×</button>
          </div>
        }

        @if (isLoading()) {
          <div class="flex justify-center items-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
        } @else if (customerData()) {
          <app-person-edit-form
            [initialData]="customerData()"
            [submitButtonText]="'Update Customer'"
            [isLoading]="customerService.isCreating()"
            (formSubmit)="onUpdateCustomer($event)"
          ></app-person-edit-form>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerEditComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly customerService = inject(CustomerService);

  // State
  readonly error = signal<string | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly customerData = signal<any>(null);

  constructor() {
    this.loadCustomer();
  }

  /**
   * Load customer data for editing
   */
  async loadCustomer(): Promise<void> {
    try {
      const customerId = this.route.snapshot.paramMap.get('id');
      if (!customerId) {
        this.error.set('Customer ID not provided');
        return;
      }

      const customer = await this.customerService.getCustomerById(customerId);
      if (customer) {
        this.customerData.set({
          businessName: customer.firstName || '',
          contactPerson: customer.lastName || '',
          emailAddress: customer.emailAddress || '',
          phoneNumber: customer.phoneNumber || ''
        });
      } else {
        this.error.set('Customer not found');
      }
    } catch (err: any) {
      this.error.set(err.message || 'Failed to load customer');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Handle customer update
   */
  async onUpdateCustomer(formData: any): Promise<void> {
    this.error.set(null);

    try {
      const customerId = this.route.snapshot.paramMap.get('id');
      if (!customerId) {
        this.error.set('Customer ID not provided');
        return;
      }

      // Map form data to backend format
      const updateData = {
        firstName: formData.businessName, // Business Name -> firstName
        lastName: formData.contactPerson,  // Contact Person -> lastName
        emailAddress: formData.emailAddress || '', // Required by Vendure, use empty string if not provided
        phoneNumber: formData.phoneNumber
      };

      const success = await this.customerService.updateCustomer(customerId, updateData);

      if (success) {
        // Navigate back to customers list
        this.router.navigate(['/dashboard/customers']);
      } else {
        this.error.set(this.customerService.error() || 'Failed to update customer');
      }
    } catch (err: any) {
      this.error.set(err.message || 'Failed to update customer');
    }
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
}
