import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

export interface Customer {
    id: string;
    name: string;
    phone?: string;
    email?: string;
}

/**
 * Customer search and creation component for credit sales
 */
@Component({
    selector: 'app-customer-selector',
    imports: [CommonModule],
    template: `
    <div class="space-y-4">
      @if (!selectedCustomer() && !showForm()) {
      <!-- Customer Search -->
      <div class="space-y-3">
        <div class="form-control">
          <label class="label">
            <span class="label-text">Search existing customer</span>
          </label>
          <div class="relative">
            <input
              type="text"
              class="input input-bordered w-full"
              placeholder="Search by name or phone..."
              [value]="searchTerm()"
              (input)="onSearchInput($any($event.target).value)"
            />
            @if (isSearching()) {
            <span class="absolute right-3 top-1/2 -translate-y-1/2">
              <span class="loading loading-spinner loading-sm"></span>
            </span>
            }
          </div>
        </div>

        <!-- Search Results -->
        @if (searchResults().length > 0) {
        <div class="space-y-2 max-h-60 overflow-y-auto">
          @for (customer of searchResults(); track customer.id) {
          <button
            class="card bg-base-200 hover:bg-base-300 w-full p-3 text-left transition-all"
            (click)="customerSelect.emit(customer)"
          >
            <div class="flex items-center gap-3">
              <div class="avatar placeholder">
                <div class="bg-primary text-primary-content w-10 rounded-full">
                  <span class="text-sm">{{ customer.name.charAt(0).toUpperCase() }}</span>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold truncate">{{ customer.name }}</div>
                <div class="text-xs text-base-content/60">{{ customer.phone }}</div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-base-content/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>
          }
        </div>
        }

        <div class="divider">OR</div>

        <!-- Create New Customer Button -->
        <button
          class="btn btn-outline btn-primary w-full"
          (click)="showForm.set(true)"
        >
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
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
          Create New Customer
        </button>
      </div>
      }

      <!-- New Customer Form -->
      @if (showForm()) {
      <div class="space-y-4">
        <div class="alert alert-info">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 flex-shrink-0"
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
          <span class="text-sm">Only basic details required for quick customer creation</span>
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text">Name *</span>
          </label>
          <input
            type="text"
            class="input input-bordered"
            placeholder="John Doe"
            [value]="newName()"
            (input)="newName.set($any($event.target).value)"
          />
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text">Phone Number *</span>
          </label>
          <input
            type="tel"
            class="input input-bordered"
            placeholder="+254712345678"
            [value]="newPhone()"
            (input)="newPhone.set($any($event.target).value)"
          />
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text">Email (optional)</span>
          </label>
          <input
            type="email"
            class="input input-bordered"
            placeholder="john@example.com"
            [value]="newEmail()"
            (input)="newEmail.set($any($event.target).value)"
          />
        </div>

        <div class="flex gap-2">
          <button
            class="btn btn-ghost flex-1"
            (click)="cancelForm()"
            [disabled]="isCreating()"
          >
            Cancel
          </button>
          <button
            class="btn btn-primary flex-1"
            (click)="createCustomer()"
            [disabled]="isCreating() || !canCreate()"
          >
            @if (isCreating()) {
            <span class="loading loading-spinner loading-sm"></span>
            } Create Customer
          </button>
        </div>
      </div>
      }

      <!-- Selected Customer Display -->
      @if (selectedCustomer()) {
      <div class="card bg-success/10 border-2 border-success">
        <div class="card-body p-4">
          <div class="flex items-center gap-3">
            <div class="avatar placeholder">
              <div class="bg-success text-success-content w-12 rounded-full">
                <span>{{ selectedCustomer()!.name.charAt(0).toUpperCase() }}</span>
              </div>
            </div>
            <div class="flex-1">
              <div class="font-bold">{{ selectedCustomer()!.name }}</div>
              <div class="text-sm text-base-content/60">{{ selectedCustomer()!.phone }}</div>
              @if (selectedCustomer()!.email) {
              <div class="text-sm text-base-content/60">{{ selectedCustomer()!.email }}</div>
              }
            </div>
            <button
              class="btn btn-ghost btn-sm btn-circle"
              (click)="customerSelect.emit(null)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
      }
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerSelectorComponent {
    readonly selectedCustomer = input.required<Customer | null>();
    readonly searchResults = input.required<Customer[]>();
    readonly isSearching = input<boolean>(false);
    readonly isCreating = input<boolean>(false);

    readonly searchTermChange = output<string>();
    readonly customerSelect = output<Customer | null>();
    readonly customerCreate = output<{ name: string; phone: string; email?: string }>();

    readonly searchTerm = signal('');
    readonly showForm = signal(false);
    readonly newName = signal('');
    readonly newPhone = signal('');
    readonly newEmail = signal('');

    readonly canCreate = () => {
        return this.newName().trim().length > 0 && this.newPhone().trim().length > 0;
    };

    onSearchInput(value: string): void {
        this.searchTerm.set(value);
        this.searchTermChange.emit(value);
    }

    createCustomer(): void {
        if (!this.canCreate()) return;

        this.customerCreate.emit({
            name: this.newName().trim(),
            phone: this.newPhone().trim(),
            email: this.newEmail().trim() || undefined,
        });
    }

    cancelForm(): void {
        this.showForm.set(false);
        this.newName.set('');
        this.newPhone.set('');
        this.newEmail.set('');
    }
}

