import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CurrencyService } from '../../../../core/services/currency.service';
import { Customer, CustomerSelectorComponent } from './customer-selector.component';

type CheckoutType = 'credit' | 'cashier' | 'cash' | null;
type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER';

/**
 * Unified checkout modal handling all payment flows
 */
@Component({
  selector: 'app-checkout-modal',
  imports: [CommonModule, CustomerSelectorComponent],
  template: `
    @if (isOpen()) {
    <div class="modal modal-open modal-middle">
      <div class="modal-box max-w-2xl p-0">
        <!-- Modal Header -->
        <div class="bg-base-200 p-4 border-b border-base-300 flex items-center justify-between">
          <h3 class="font-bold text-lg">Checkout</h3>
          <button class="btn btn-ghost btn-sm btn-circle" (click)="closeModal.emit()">✕</button>
        </div>

        <div class="p-6">
          <!-- Error Alert -->
          @if (error()) {
          <div role="alert" class="alert alert-error mb-4">
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
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{{ error() }}</span>
          </div>
          }

          <!-- Cashier Flow -->
          @if (checkoutType() === 'cashier') {
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h4 class="font-semibold">Submit to Cashier</h4>
            </div>

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
              <div class="text-sm">
                <p class="font-semibold">Two-Step Process</p>
                <p class="mt-1">
                  Order will be marked as PENDING_PAYMENT and sent to the cashier station.
                </p>
              </div>
            </div>

            <!-- Order Summary -->
            <div class="bg-base-200 rounded-lg p-4">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-base-content/60">Items</span>
                <span class="font-semibold">{{ itemCount() }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="font-bold">Total</span>
                <span class="text-2xl font-bold text-info text-tabular">
                  {{ currencyService.format(total()) }}
                </span>
              </div>
            </div>

            <button
              class="btn btn-info btn-lg w-full"
              (click)="completeCashier.emit()"
              [disabled]="isProcessing()"
            >
              @if (isProcessing()) {
              <span class="loading loading-spinner"></span>
              } @else {
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              } Submit to Cashier
            </button>
          </div>
          }

          <!-- Credit Sale Flow -->
          @if (checkoutType() === 'credit') {
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h4 class="font-semibold">Credit Sale - Select Customer</h4>
            </div>

            <app-customer-selector
              [selectedCustomer]="selectedCustomer()"
              [searchResults]="customerSearchResults()"
              [isSearching]="isSearchingCustomers()"
              [isCreating]="isProcessing()"
              (searchTermChange)="customerSearch.emit($event)"
              (customerSelect)="customerSelect.emit($event)"
              (customerCreate)="customerCreate.emit($event)"
            />

            <!-- Complete Credit Sale -->
            @if (selectedCustomer()) {
            <div class="space-y-4">
              <!-- Order Summary -->
              <div class="bg-base-200 rounded-lg p-4">
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm text-base-content/60">Items</span>
                  <span class="font-semibold">{{ itemCount() }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="font-bold">Total Due</span>
                  <span class="text-2xl font-bold text-warning text-tabular">
                    {{ currencyService.format(total()) }}
                  </span>
                </div>
              </div>

              <button
                class="btn btn-warning btn-lg w-full"
                (click)="completeCredit.emit()"
                [disabled]="isProcessing()"
              >
                @if (isProcessing()) {
                <span class="loading loading-spinner"></span>
                } @else {
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                } Create Credit Sale
              </button>
            </div>
            }
          </div>
          }

          <!-- Cash Sale Flow -->
          @if (checkoutType() === 'cash') {
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h4 class="font-semibold">Cash Sale - Select Payment Method</h4>
            </div>

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
              <span class="text-sm">Payment processing integration coming soon</span>
            </div>

            <!-- Payment Method Grid -->
            <div class="grid grid-cols-2 gap-3">
              @for (method of paymentMethods; track method.value) {
              <button
                class="card hover:bg-base-200 border-2 transition-all p-4"
                [class.border-success]="selectedPaymentMethod() === method.value"
                [class.bg-success/10]="selectedPaymentMethod() === method.value"
                [class.border-base-300]="selectedPaymentMethod() !== method.value"
                (click)="paymentMethodSelect.emit(method.value)"
              >
                <div class="flex flex-col items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-8 w-8"
                    [class.text-success]="selectedPaymentMethod() === method.value"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      [attr.d]="method.icon"
                    />
                  </svg>
                  <span class="font-semibold">{{ method.label }}</span>
                </div>
              </button>
              }
            </div>

            @if (selectedPaymentMethod()) {
            <div class="space-y-4">
              <!-- Order Summary -->
              <div class="bg-base-200 rounded-lg p-4">
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm text-base-content/60">Items</span>
                  <span class="font-semibold">{{ itemCount() }}</span>
                </div>
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm text-base-content/60">Payment Method</span>
                  <span class="badge badge-success">{{ selectedPaymentMethod() }}</span>
                </div>
                <div class="divider my-2"></div>
                <div class="flex justify-between items-center">
                  <span class="font-bold">Total</span>
                  <span class="text-2xl font-bold text-success text-tabular">
                    {{ currencyService.format(total()) }}
                  </span>
                </div>
              </div>

              <button
                class="btn btn-success btn-lg w-full"
                (click)="completeCash.emit()"
                [disabled]="isProcessing()"
              >
                @if (isProcessing()) {
                <span class="loading loading-spinner"></span>
                } @else {
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                } Complete Sale
              </button>
            </div>
            }
          </div>
          }
        </div>
      </div>
      <div class="modal-backdrop" (click)="closeModal.emit()"></div>
    </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutModalComponent {
  readonly currencyService = inject(CurrencyService);

  readonly isOpen = input.required<boolean>();
  readonly checkoutType = input.required<CheckoutType>();
  readonly itemCount = input.required<number>();
  readonly total = input.required<number>();
  readonly error = input<string | null>(null);
  readonly isProcessing = input<boolean>(false);

  // Credit sale inputs
  readonly selectedCustomer = input<Customer | null>(null);
  readonly customerSearchResults = input<Customer[]>([]);
  readonly isSearchingCustomers = input<boolean>(false);

  // Cash sale inputs
  readonly selectedPaymentMethod = input<PaymentMethod | null>(null);

  // Outputs
  readonly completeCashier = output<void>();
  readonly completeCredit = output<void>();
  readonly completeCash = output<void>();
  readonly customerSearch = output<string>();
  readonly customerSelect = output<Customer | null>();
  readonly customerCreate = output<{ name: string; phone: string; email?: string }>();
  readonly paymentMethodSelect = output<PaymentMethod>();
  readonly closeModal = output<void>();

  readonly paymentMethods = [
    {
      value: 'CASH' as PaymentMethod,
      label: 'Cash',
      icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    },
    {
      value: 'MOBILE_MONEY' as PaymentMethod,
      label: 'M-Pesa',
      icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
    },
  ];
}

