import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
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
    <div class="modal modal-open modal-bottom sm:modal-middle">
      <div class="modal-box max-w-2xl p-0 max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between p-3 border-b border-base-300 flex-shrink-0">
          <h3 class="font-bold">Cart ({{ itemCount() }})</h3>
          <button class="btn btn-ghost btn-sm btn-circle" (click)="closeModal.emit()">✕</button>
        </div>

        <!-- Items List -->
        <div class="flex-1 overflow-y-auto">
          @if (items().length === 0) {
          <div class="text-center py-12 text-base-content/50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-12 w-12 mx-auto mb-2 opacity-40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p class="text-sm">Cart is empty</p>
          </div>
          } @else {
          <div class="divide-y divide-base-300">
            @for (item of items(); track item.variant.id) {
            <div class="p-2 flex gap-2 items-center hover:bg-base-200/50 transition-colors border-l-4 border-l-primary">
              <!-- Quantity Controls -->
              <div class="flex flex-col items-center justify-center gap-0.5 min-w-[44px]">
                <button
                  class="btn btn-xs btn-ghost btn-square w-7 h-7 min-h-0 p-0"
                  (click)="quantityChange.emit({ variantId: item.variant.id, quantity: item.quantity + 1 })"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <div class="text-sm font-bold text-tabular w-9 text-center bg-base-200 rounded px-1 py-0.5">
                  {{ item.quantity }}
                </div>
                <button
                  class="btn btn-xs btn-ghost btn-square w-7 h-7 min-h-0 p-0"
                  (click)="quantityChange.emit({ variantId: item.variant.id, quantity: item.quantity - 1 })"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              <!-- Product Info -->
              <div class="flex-1 min-w-0 py-1">
                <div class="font-semibold text-sm leading-tight truncate">{{ item.variant.productName }}</div>
                @if (item.variant.name !== item.variant.productName) {
                <div class="text-xs text-base-content/60 leading-tight truncate">{{ item.variant.name }}</div>
                }
                <div class="text-xs text-base-content/50 mt-0.5">
                  \${{ item.variant.priceWithTax | number : '1.2-2' }}
                </div>
              </div>

              <!-- Amount & Remove -->
              <div class="flex flex-col items-end justify-center gap-1 min-w-[64px]">
                <div class="font-bold text-base text-tabular">\${{ item.subtotal | number : '1.2-2' }}</div>
                <button
                  class="btn btn-xs btn-ghost btn-circle w-6 h-6 min-h-0 p-0 text-error"
                  (click)="removeItem.emit(item.variant.id)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-3.5 w-3.5"
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
        <div class="border-t border-base-300 p-3 bg-base-200/50 flex-shrink-0">
          <!-- Total -->
          <div class="flex items-center justify-between mb-3 px-1">
            <span class="font-bold text-lg">Total</span>
            <span class="text-2xl font-bold text-primary text-tabular">
              \${{ total() | number : '1.2-2' }}
            </span>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-around gap-1">
            <button
              class="flex flex-col items-center justify-center gap-1 min-w-[72px] min-h-[64px] rounded-lg hover:bg-warning/10 active:bg-warning/20 transition-colors flex-1 text-warning border-2 border-warning"
              (click)="checkoutCredit.emit()"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
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
              <span class="text-xs font-medium">Credit</span>
            </button>

            @if (showCashierFlow()) {
            <button
              class="flex flex-col items-center justify-center gap-1 min-w-[72px] min-h-[64px] rounded-lg hover:bg-info/10 active:bg-info/20 transition-colors flex-1 text-info border-2 border-info"
              (click)="checkoutCashier.emit()"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
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
              <span class="text-xs font-medium">Cashier</span>
            </button>
            }

            <button
              class="flex flex-col items-center justify-center gap-1 min-w-[72px] min-h-[64px] rounded-lg hover:bg-success/10 active:bg-success/20 transition-colors flex-1 text-success border-2 border-success"
              (click)="checkoutCash.emit()"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
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
              <span class="text-xs font-medium">Cash</span>
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

