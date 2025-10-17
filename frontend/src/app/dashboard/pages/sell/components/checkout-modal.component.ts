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
    <div class="modal modal-open modal-bottom sm:modal-middle animate-in fade-in duration-300">
      <div class="modal-box max-w-2xl p-0 max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        <!-- Modal Header -->
        <div class="bg-base-100 p-4 border-b border-base-300 flex items-center justify-between flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="indicator">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span class="indicator-item badge badge-primary badge-sm">{{ itemCount() }}</span>
            </div>
            <h3 class="font-bold text-lg">Complete Purchase</h3>
          </div>
          <button 
            class="btn btn-ghost btn-sm btn-circle hover:bg-base-200 transition-colors" 
            (click)="closeModal.emit()"
            aria-label="Close checkout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6">
          <!-- Error Alert -->
          @if (error()) {
          <div role="alert" class="alert alert-error mb-4 animate-in slide-in-from-top-2 duration-300">
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
          <div class="space-y-6 animate-in slide-in-from-left-2 duration-300">
            <div class="text-center">
              <div class="inline-flex items-center justify-center w-16 h-16 bg-info/10 rounded-full mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-8 w-8 text-info"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h4 class="font-bold text-xl mb-2">Send to Cashier</h4>
              <p class="text-base-content/60">Order will be processed at the cashier station</p>
            </div>

            <div class="alert alert-info animate-in slide-in-from-top-2 duration-300 delay-100">
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
            <div class="bg-base-200 rounded-xl p-6 animate-in slide-in-from-bottom-2 duration-300 delay-200">
              <div class="flex justify-between items-center mb-3">
                <span class="text-sm text-base-content/60">Items</span>
                <span class="font-semibold text-lg">{{ itemCount() }}</span>
              </div>
              <div class="divider my-3"></div>
              <div class="flex justify-between items-center">
                <span class="font-bold text-xl">Total</span>
                <span class="text-3xl font-bold text-info text-tabular">
                  {{ currencyService.format(total()) }}
                </span>
              </div>
            </div>

            <button
              class="btn btn-info btn-lg w-full hover:scale-105 active:scale-95 transition-transform animate-in slide-in-from-bottom-2 duration-300 delay-300"
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
          <div class="space-y-6 animate-in slide-in-from-left-2 duration-300">
            <div class="text-center">
              <div class="inline-flex items-center justify-center w-16 h-16 bg-warning/10 rounded-full mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-8 w-8 text-warning"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h4 class="font-bold text-xl mb-2">Credit Sale</h4>
              <p class="text-base-content/60">Select customer for credit transaction</p>
            </div>

            <div class="animate-in slide-in-from-top-2 duration-300 delay-100">
              <app-customer-selector
                [selectedCustomer]="selectedCustomer()"
                [searchResults]="customerSearchResults()"
                [isSearching]="isSearchingCustomers()"
                [isCreating]="isProcessing()"
                (searchTermChange)="customerSearch.emit($event)"
                (customerSelect)="customerSelect.emit($event)"
                (customerCreate)="customerCreate.emit($event)"
              />
            </div>

            <!-- Complete Credit Sale -->
            @if (selectedCustomer()) {
            <div class="space-y-6 animate-in slide-in-from-bottom-2 duration-300 delay-200">
              <!-- Order Summary -->
              <div class="bg-base-200 rounded-xl p-6">
                <div class="flex justify-between items-center mb-3">
                  <span class="text-sm text-base-content/60">Items</span>
                  <span class="font-semibold text-lg">{{ itemCount() }}</span>
                </div>
                <div class="divider my-3"></div>
                <div class="flex justify-between items-center">
                  <span class="font-bold text-xl">Total Due</span>
                  <span class="text-3xl font-bold text-warning text-tabular">
                    {{ currencyService.format(total()) }}
                  </span>
                </div>
              </div>

              <button
                class="btn btn-warning btn-lg w-full hover:scale-105 active:scale-95 transition-transform"
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
          <div class="space-y-6 animate-in slide-in-from-left-2 duration-300">
            <div class="text-center">
              <div class="inline-flex items-center justify-center w-16 h-16 bg-success/10 rounded-full mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-8 w-8 text-success"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h4 class="font-bold text-xl mb-2">Cash Payment</h4>
              <p class="text-base-content/60">Select your preferred payment method</p>
            </div>

            <div class="alert alert-info animate-in slide-in-from-top-2 duration-300 delay-100">
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
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-bottom-2 duration-300 delay-200">
              @for (method of paymentMethods; track method.value; let i = $index) {
              <button
                class="card hover:bg-base-200 border-2 transition-all duration-200 p-6 hover:scale-105 active:scale-95"
                [class.border-success]="selectedPaymentMethod() === method.value"
                [class.bg-success/10]="selectedPaymentMethod() === method.value"
                [class.border-base-300]="selectedPaymentMethod() !== method.value"
                [class.animate-in]="selectedPaymentMethod() === method.value"
                [class.slide-in-from-left-2]="selectedPaymentMethod() === method.value"
                (click)="paymentMethodSelect.emit(method.value)"
                [style.animation-delay]="(i * 100) + 'ms'"
              >
                <div class="flex flex-col items-center gap-3">
                  <div class="w-12 h-12 rounded-full flex items-center justify-center"
                       [class.bg-success/20]="selectedPaymentMethod() === method.value"
                       [class.bg-base-200]="selectedPaymentMethod() !== method.value">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-6 w-6"
                      [class.text-success]="selectedPaymentMethod() === method.value"
                      [class.text-base-content/60]="selectedPaymentMethod() !== method.value"
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
                  </div>
                  <span class="font-semibold text-sm">{{ method.label }}</span>
                </div>
              </button>
              }
            </div>

            @if (selectedPaymentMethod()) {
            <div class="space-y-6 animate-in slide-in-from-bottom-2 duration-300 delay-300">
              <!-- Order Summary -->
              <div class="bg-base-200 rounded-xl p-6">
                <div class="flex justify-between items-center mb-3">
                  <span class="text-sm text-base-content/60">Items</span>
                  <span class="font-semibold text-lg">{{ itemCount() }}</span>
                </div>
                <div class="flex justify-between items-center mb-3">
                  <span class="text-sm text-base-content/60">Payment Method</span>
                  <span class="badge badge-success badge-lg">{{ selectedPaymentMethod() }}</span>
                </div>
                <div class="divider my-3"></div>
                <div class="flex justify-between items-center">
                  <span class="font-bold text-xl">Total</span>
                  <span class="text-3xl font-bold text-success text-tabular">
                    {{ currencyService.format(total()) }}
                  </span>
                </div>
              </div>

              <button
                class="btn btn-success btn-lg w-full hover:scale-105 active:scale-95 transition-transform"
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

