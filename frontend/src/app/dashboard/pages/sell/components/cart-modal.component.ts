import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { CurrencyService } from '../../../../core/services/currency.service';
import { ProductVariant } from '../../../../core/services/product-search.service';

export interface CartItem {
  variant: ProductVariant;
  quantity: number;
  subtotal: number;
}

/**
 * Cart modal with item management
 */
@Component({
  selector: 'app-cart-modal',
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
    <div class="modal modal-open modal-bottom sm:modal-middle animate-in fade-in duration-300">
      <div class="modal-box max-w-2xl p-0 max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-base-300 flex-shrink-0 bg-base-100">
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
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span class="indicator-item badge badge-primary badge-sm">{{ itemCount() }}</span>
            </div>
            <h3 class="font-bold text-lg">Shopping Cart</h3>
          </div>
          <button 
            class="btn btn-ghost btn-sm btn-circle hover:bg-base-200 transition-colors" 
            (click)="closeModal.emit()"
            aria-label="Close cart"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Items List -->
        <div class="flex-1 overflow-y-auto">
          @if (items().length === 0) {
          <div class="text-center py-16 text-base-content/50 animate-in fade-in duration-500">
            <div class="text-6xl mb-4 opacity-40">🛒</div>
            <p class="text-lg font-medium mb-2">Your cart is empty</p>
            <p class="text-sm">Add some products to get started</p>
          </div>
          } @else {
          <div class="divide-y divide-base-200">
            @for (item of items(); track item.variant.id; let i = $index) {
            <div 
              class="p-4 flex gap-3 items-center hover:bg-base-200/50 transition-all duration-200 border-l-4 border-l-primary animate-in slide-in-from-left-2 duration-300"
              [style.animation-delay]="(i * 50) + 'ms'"
            >
              <!-- Quantity Controls -->
              <div class="flex flex-col items-center justify-center gap-1 min-w-[48px]">
                <button
                  class="btn btn-xs btn-ghost btn-square w-8 h-8 min-h-0 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
                  (click)="quantityChange.emit({ variantId: item.variant.id, quantity: item.quantity + 1 })"
                  aria-label="Increase quantity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <div class="text-sm font-bold text-tabular w-10 text-center bg-base-200 rounded-lg px-2 py-1 min-h-[28px] flex items-center justify-center">
                  {{ item.quantity }}
                </div>
                <button
                  class="btn btn-xs btn-ghost btn-square w-8 h-8 min-h-0 p-0 hover:bg-error/10 hover:text-error transition-colors"
                  (click)="quantityChange.emit({ variantId: item.variant.id, quantity: item.quantity - 1 })"
                  aria-label="Decrease quantity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              <!-- Product Info -->
              <div class="flex-1 min-w-0 py-1">
                <div class="font-semibold text-base leading-tight truncate">{{ item.variant.productName }}</div>
                @if (item.variant.name !== item.variant.productName) {
                <div class="text-sm text-base-content/60 leading-tight truncate mt-0.5">{{ item.variant.name }}</div>
                }
                <div class="text-sm text-base-content/50 mt-1">
                  {{ currencyService.format(item.variant.priceWithTax) }} each
                </div>
              </div>

              <!-- Amount & Remove -->
              <div class="flex flex-col items-end justify-center gap-2 min-w-[80px]">
                <div class="font-bold text-lg text-tabular text-primary">{{ currencyService.format(item.subtotal) }}</div>
                <button
                  class="btn btn-xs btn-ghost btn-circle w-7 h-7 min-h-0 p-0 text-error hover:bg-error/10 transition-colors"
                  (click)="removeItem.emit(item.variant.id)"
                  aria-label="Remove item"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            }
          </div>
          }
        </div>

        <!-- Footer - Total & Actions -->
        @if (items().length > 0) {
        <div class="border-t border-base-300 p-4 bg-base-100 flex-shrink-0 animate-in slide-in-from-bottom-2 duration-300">
          <!-- Total -->
          <div class="flex items-center justify-between mb-4 px-1">
            <span class="font-bold text-xl">Total</span>
            <span class="text-3xl font-bold text-primary text-tabular">
              {{ currencyService.format(total()) }}
            </span>
          </div>

          <!-- Action Buttons -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <!-- Credit Button -->
            <button
              class="flex flex-col items-center justify-center gap-2 min-h-[72px] rounded-xl hover:bg-warning/10 active:bg-warning/20 transition-all duration-200 flex-1 text-warning border-2 border-warning hover:scale-105 active:scale-95"
              (click)="checkoutCredit.emit()"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-7 w-7"
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
              <span class="text-sm font-semibold">Credit</span>
            </button>

            <!-- Cashier Button (if enabled) -->
            @if (showCashierFlow()) {
            <button
              class="flex flex-col items-center justify-center gap-2 min-h-[72px] rounded-xl hover:bg-info/10 active:bg-info/20 transition-all duration-200 flex-1 text-info border-2 border-info hover:scale-105 active:scale-95"
              (click)="checkoutCashier.emit()"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-7 w-7"
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
              <span class="text-sm font-semibold">Cashier</span>
            </button>
            }

            <!-- Cash Button -->
            <button
              class="flex flex-col items-center justify-center gap-2 min-h-[72px] rounded-xl hover:bg-success/10 active:bg-success/20 transition-all duration-200 flex-1 text-success border-2 border-success hover:scale-105 active:scale-95"
              (click)="checkoutCash.emit()"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-7 w-7"
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
              <span class="text-sm font-semibold">Cash</span>
            </button>
          </div>
        </div>
        }
      </div>
      <div class="modal-backdrop" (click)="closeModal.emit()"></div>
    </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartModalComponent {
  readonly currencyService = inject(CurrencyService);

  readonly isOpen = input.required<boolean>();
  readonly items = input.required<CartItem[]>();
  readonly total = input.required<number>();
  readonly showCashierFlow = input<boolean>(true);

  readonly itemCount = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly quantityChange = output<{ variantId: string; quantity: number }>();
  readonly removeItem = output<string>();
  readonly checkoutCredit = output<void>();
  readonly checkoutCashier = output<void>();
  readonly checkoutCash = output<void>();
  readonly closeModal = output<void>();
}

