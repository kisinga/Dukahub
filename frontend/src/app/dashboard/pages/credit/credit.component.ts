import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { CustomerService, CreditCustomerSummary } from '../../../core/services/customer.service';

@Component({
  selector: 'app-credit',
  imports: [CommonModule],
  template: `
    <div class="space-y-6 p-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold">Credit Management</h1>
          <p class="text-base-content/60 text-sm">
            Approve customers for credit, adjust limits, review outstanding balances, and manage credit duration.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <input
            type="text"
            class="input input-bordered w-full sm:w-64"
            placeholder="Search by customer or phone..."
            [value]="searchTerm()"
            (input)="searchTerm.set($any($event.target).value)"
          />
          <button class="btn btn-outline btn-sm" (click)="reloadCustomers()" [disabled]="isLoading()">
            @if (isLoading()) {
            <span class="loading loading-spinner loading-sm"></span>
            } Reload
          </button>
        </div>
      </div>

      @if (!hasPermission()) {
      <div class="alert alert-warning">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24"
          stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>You need credit management permissions to access this page.</span>
      </div>
      } @else {
      <div class="bg-base-100 rounded-xl shadow-sm border border-base-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr class="text-xs uppercase tracking-wide text-base-content/70">
                <th>Name</th>
                <th>Contact</th>
                <th class="text-right">Outstanding</th>
                <th class="text-right">Limit</th>
                <th class="text-right">Available</th>
                <th>Duration</th>
                <th>Last Repayment</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @if (isLoading()) {
              <tr>
                <td colspan="9" class="text-center py-10">
                  <span class="loading loading-spinner loading-lg"></span>
                </td>
              </tr>
              } @else if (filteredCustomers().length === 0) {
              <tr>
                <td colspan="9" class="text-center py-10 text-base-content/60">
                  No customers found. Try adjusting your search or onboard a customer first.
                </td>
              </tr>
              } @else {
              @for (customer of filteredCustomers(); track customer.id) {
              <tr>
                <td>
                  <div class="font-semibold">{{ customer.name || 'Unnamed Customer' }}</div>
                  <div class="text-xs text-base-content/60">ID: {{ customer.id }}</div>
                </td>
                <td>
                  <div class="text-sm">{{ customer.phone || '—' }}</div>
                  <div class="text-xs text-base-content/60">{{ customer.email || '—' }}</div>
                </td>
                <td class="text-right text-sm">
                  {{ currencyService.format(customer.outstandingAmount * 100) }}
                </td>
                <td class="text-right text-sm">
                  @if (isEditingLimit(customer.id)) {
                  <div class="flex flex-col items-end gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      class="input input-bordered input-sm w-28 text-right"
                      [value]="editLimitValue()"
                      (input)="editLimitValue.set(($any($event.target).valueAsNumber ?? 0))"
                    />
                    <div class="flex gap-1">
                      <button class="btn btn-xs btn-primary" (click)="saveLimit(customer)"
                        [disabled]="actionInProgress() === customer.id">
                        @if (actionInProgress() === customer.id) {
                        <span class="loading loading-spinner loading-xs"></span>
                        } Save
                      </button>
                      <button class="btn btn-xs btn-ghost" (click)="stopEditingLimit()"
                        [disabled]="actionInProgress() === customer.id">
                        Cancel
                      </button>
                    </div>
                  </div>
                  } @else {
                  <div class="flex items-center justify-end gap-2">
                    <span>{{ currencyService.format(customer.creditLimit * 100) }}</span>
                    <button class="btn btn-link btn-xs" (click)="startEditingLimit(customer)">Edit</button>
                  </div>
                  }
                </td>
                <td class="text-right text-sm">
                  {{ currencyService.format(customer.availableCredit * 100) }}
                </td>
                <td class="text-sm">
                  @if (isEditingDuration(customer.id)) {
                  <div class="flex flex-col gap-2">
                    <input
                      type="number"
                      min="1"
                      class="input input-bordered input-sm w-20 text-right"
                      [value]="editDurationValue()"
                      (input)="editDurationValue.set(($any($event.target).valueAsNumber ?? 1))"
                    />
                    <div class="flex gap-1">
                      <button class="btn btn-xs btn-primary" (click)="saveDuration(customer)"
                        [disabled]="actionInProgress() === customer.id">
                        @if (actionInProgress() === customer.id) {
                        <span class="loading loading-spinner loading-xs"></span>
                        } Save
                      </button>
                      <button class="btn btn-xs btn-ghost" (click)="stopEditingDuration()"
                        [disabled]="actionInProgress() === customer.id">
                        Cancel
                      </button>
                    </div>
                  </div>
                  } @else {
                  <div class="flex items-center gap-2">
                    <span>{{ customer.creditDuration }} days</span>
                    <button class="btn btn-link btn-xs" (click)="startEditingDuration(customer)">Edit</button>
                  </div>
                  }
                </td>
                <td class="text-sm">
                  @if (customer.lastRepaymentDate) {
                  <div class="text-xs">{{ formatDate(customer.lastRepaymentDate) }}</div>
                  <div class="text-xs text-base-content/60">{{ currencyService.format(customer.lastRepaymentAmount * 100) }}</div>
                  } @else {
                  <span class="text-base-content/60">—</span>
                  }
                </td>
                <td>
                  <span class="badge"
                    [class.badge-success]="customer.isCreditApproved"
                    [class.badge-warning]="!customer.isCreditApproved">
                    {{ customer.isCreditApproved ? 'Approved' : 'Pending' }}
                  </span>
                </td>
                <td>
                  <div class="flex justify-end gap-2">
                    @if (customer.isCreditApproved) {
                    <button class="btn btn-xs btn-outline" (click)="revoke(customer)"
                      [disabled]="actionInProgress() === customer.id">
                      @if (actionInProgress() === customer.id) {
                      <span class="loading loading-spinner loading-xs"></span>
                      } Revoke
                    </button>
                    } @else {
                    <button class="btn btn-xs btn-primary" (click)="approve(customer)"
                      [disabled]="actionInProgress() === customer.id">
                      @if (actionInProgress() === customer.id) {
                      <span class="loading loading-spinner loading-xs"></span>
                      } Approve
                    </button>
                    }
                  </div>
                </td>
              </tr>
              }
              }
            </tbody>
          </table>
        </div>
      </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreditComponent implements OnInit {
  private readonly customerService = inject(CustomerService);
  private readonly authService = inject(AuthService);
  readonly currencyService = inject(CurrencyService);

  readonly isLoading = signal(false);
  readonly actionInProgress = signal<string | null>(null);
  readonly customers = signal<CreditCustomerSummary[]>([]);
  readonly searchTerm = signal('');
  readonly editingLimitCustomerId = signal<string | null>(null);
  readonly editingDurationCustomerId = signal<string | null>(null);
  readonly editLimitValue = signal(0);
  readonly editDurationValue = signal(30);

  readonly hasPermission = this.authService.hasCreditManagementPermission;

  readonly filteredCustomers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.customers();
    }
    return this.customers().filter((customer) => {
      return (
        customer.name.toLowerCase().includes(term) ||
        (customer.phone ?? '').toLowerCase().includes(term) ||
        customer.id.toLowerCase().includes(term)
      );
    });
  });

  ngOnInit(): void {
    if (this.hasPermission()) {
      void this.reloadCustomers();
    }
  }

  isEditingLimit(customerId: string): boolean {
    return this.editingLimitCustomerId() === customerId;
  }

  isEditingDuration(customerId: string): boolean {
    return this.editingDurationCustomerId() === customerId;
  }

  startEditingLimit(customer: CreditCustomerSummary): void {
    this.editingLimitCustomerId.set(customer.id);
    this.editLimitValue.set(customer.creditLimit);
    this.stopEditingDuration(); // Ensure only one edit at a time
  }

  stopEditingLimit(): void {
    this.editingLimitCustomerId.set(null);
  }

  startEditingDuration(customer: CreditCustomerSummary): void {
    this.editingDurationCustomerId.set(customer.id);
    this.editDurationValue.set(customer.creditDuration);
    this.stopEditingLimit(); // Ensure only one edit at a time
  }

  stopEditingDuration(): void {
    this.editingDurationCustomerId.set(null);
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return '—';
    }
  }

  async reloadCustomers(): Promise<void> {
    this.isLoading.set(true);
    try {
      const customers = await this.customerService.listCreditCustomers();
      this.customers.set(customers);
    } catch (error) {
      console.error('Failed to load credit customers', error);
    } finally {
      this.isLoading.set(false);
      this.actionInProgress.set(null);
    }
  }

  async approve(customer: CreditCustomerSummary): Promise<void> {
    this.actionInProgress.set(customer.id);
    try {
      const updated = await this.customerService.approveCustomerCredit(
        customer.id,
        true,
        Math.max(customer.creditLimit, 0),
        customer,
        customer.creditDuration
      );
      this.updateCustomer(updated);
    } catch (error) {
      console.error('Failed to approve customer credit', error);
    } finally {
      this.actionInProgress.set(null);
    }
  }

  async revoke(customer: CreditCustomerSummary): Promise<void> {
    this.actionInProgress.set(customer.id);
    try {
      const updated = await this.customerService.approveCustomerCredit(
        customer.id,
        false,
        0,
        customer,
        customer.creditDuration
      );
      this.updateCustomer(updated);
    } catch (error) {
      console.error('Failed to revoke customer credit', error);
    } finally {
      this.actionInProgress.set(null);
    }
  }

  async saveLimit(customer: CreditCustomerSummary): Promise<void> {
    const newLimit = Math.max(this.editLimitValue(), 0);
    this.actionInProgress.set(customer.id);
    try {
      const updated = await this.customerService.updateCustomerCreditLimit(
        customer.id,
        newLimit,
        customer,
        customer.creditDuration
      );
      this.updateCustomer(updated);
      this.stopEditingLimit();
    } catch (error) {
      console.error('Failed to update credit limit', error);
    } finally {
      this.actionInProgress.set(null);
    }
  }

  async saveDuration(customer: CreditCustomerSummary): Promise<void> {
    const newDuration = Math.max(this.editDurationValue(), 1);
    this.actionInProgress.set(customer.id);
    try {
      const updated = await this.customerService.updateCreditDuration(
        customer.id,
        newDuration,
        customer
      );
      this.updateCustomer(updated);
      this.stopEditingDuration();
    } catch (error) {
      console.error('Failed to update credit duration', error);
    } finally {
      this.actionInProgress.set(null);
    }
  }

  private updateCustomer(updated: CreditCustomerSummary): void {
    this.customers.update((items) =>
      items.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
    );
  }
}

