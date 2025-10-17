import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CurrencyService } from '../../../../core/services/currency.service';
import { ProductSearchResult, ProductVariant } from '../../../../core/services/product-search.service';

/**
 * Modal for confirming product and selecting variant/quantity
 */
@Component({
  selector: 'app-product-confirm-modal',
  imports: [CommonModule],
  template: `
    @if (isOpen() && product()) {
    <div class="modal modal-open modal-bottom sm:modal-middle animate-in">
      <div class="modal-box max-w-xl p-0">
        <!-- Header -->
        <div class="bg-success/10 p-3 border-b border-base-300">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 text-success"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 class="font-bold">✓ Product Found</h3>
            </div>
            <button class="btn btn-ghost btn-sm btn-circle" (click)="closeModal.emit()">✕</button>
          </div>
        </div>

        <div class="p-3">
          <!-- Product Info -->
          <div class="flex gap-3 mb-3">
            @if (product()!.featuredAsset) {
            <img
              [src]="product()!.featuredAsset!.preview"
              [alt]="product()!.name"
              class="w-16 h-16 rounded-lg object-cover"
            />
            } @else {
            <div class="w-16 h-16 rounded-lg bg-base-300 flex items-center justify-center">
              <span class="text-2xl">📦</span>
            </div>
            }
            <div class="flex-1 min-w-0">
              <h4 class="font-bold text-base leading-tight">{{ product()!.name }}</h4>
              <p class="text-xs opacity-60 mt-0.5">
                {{ product()!.variants.length }} variant{{ product()!.variants.length > 1 ? 's' : '' }}
              </p>
            </div>
          </div>

          <!-- Variant Selection -->
          @if (product()!.variants.length > 1) {
          <div class="space-y-1">
            <p class="text-xs font-medium opacity-60 px-1 mb-1">Select variant:</p>
            @for (variant of product()!.variants; track variant.id) {
            <button
              class="w-full flex items-center justify-between gap-2 p-3 rounded-lg transition-all border-2"
              [class.bg-base-200]="variant.stockLevel === 'IN_STOCK'"
              [class.bg-error/10]="variant.stockLevel === 'OUT_OF_STOCK'"
              [class.border-transparent]="variant.stockLevel === 'IN_STOCK'"
              [class.border-error/30]="variant.stockLevel === 'OUT_OF_STOCK'"
              [class.hover:bg-base-300]="variant.stockLevel === 'IN_STOCK'"
              [class.hover:border-primary]="variant.stockLevel === 'IN_STOCK'"
              [class.active:scale-[0.98]]="variant.stockLevel === 'IN_STOCK'"
              [class.cursor-pointer]="variant.stockLevel === 'IN_STOCK'"
              [class.cursor-not-allowed]="variant.stockLevel === 'OUT_OF_STOCK'"
              [class.opacity-60]="variant.stockLevel === 'OUT_OF_STOCK'"
              [disabled]="variant.stockLevel === 'OUT_OF_STOCK'"
              (click)="variant.stockLevel === 'IN_STOCK' && variantSelected.emit({ variant, quantity: 1 })"
            >
              <div class="text-left min-w-0 flex-1">
                <div class="font-semibold text-sm truncate">{{ variant.name }}</div>
                <div class="text-xs opacity-60">{{ variant.sku }}</div>
                @if (variant.stockLevel === 'OUT_OF_STOCK') {
                <div class="text-xs text-error font-medium mt-1">Out of Stock</div>
                }
              </div>
              <div class="text-right flex items-center gap-2">
                <div class="text-base font-bold text-tabular">
                  {{ currencyService.format(variant.priceWithTax) }}
                </div>
                <div
                  class="badge badge-sm"
                  [class.badge-success]="variant.stockLevel === 'IN_STOCK'"
                  [class.badge-error]="variant.stockLevel === 'OUT_OF_STOCK'"
                >
                  @if (variant.stockLevel === 'IN_STOCK') {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Available
                  } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Unavailable
                  }
                </div>
              </div>
            </button>
            }
          </div>
          } @else if (product()!.variants.length === 1) {
          <!-- Single Variant -->
          <div 
            class="rounded-lg p-3 mb-3 border-2"
            [class.bg-base-200]="product()!.variants[0].stockLevel === 'IN_STOCK'"
            [class.bg-error/10]="product()!.variants[0].stockLevel === 'OUT_OF_STOCK'"
            [class.border-transparent]="product()!.variants[0].stockLevel === 'IN_STOCK'"
            [class.border-error/30]="product()!.variants[0].stockLevel === 'OUT_OF_STOCK'"
          >
            <div class="flex justify-between items-center">
              <div class="min-w-0 flex-1">
                <div class="font-semibold text-sm">{{ product()!.variants[0].name }}</div>
                <div class="text-xs opacity-60">{{ product()!.variants[0].sku }}</div>
                @if (product()!.variants[0].stockLevel === 'OUT_OF_STOCK') {
                <div class="text-xs text-error font-medium mt-1">Out of Stock</div>
                }
              </div>
              <div class="text-right flex items-center gap-2">
                <div class="text-xl font-bold text-primary text-tabular">
                  {{ currencyService.format(product()!.variants[0].priceWithTax) }}
                </div>
                <div
                  class="badge badge-sm"
                  [class.badge-success]="product()!.variants[0].stockLevel === 'IN_STOCK'"
                  [class.badge-error]="product()!.variants[0].stockLevel === 'OUT_OF_STOCK'"
                >
                  @if (product()!.variants[0].stockLevel === 'IN_STOCK') {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Available
                  } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Unavailable
                  }
                </div>
              </div>
            </div>
          </div>

          @if (product()!.variants[0].stockLevel === 'IN_STOCK') {
          <!-- Quantity Selector -->
          <div class="bg-base-100 rounded-lg p-3 mb-3">
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm font-medium">Quantity</span>
              <div class="flex items-center gap-2">
                <button 
                  class="btn btn-sm btn-circle btn-ghost"
                  (click)="quantityInput.stepDown()"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
                  </svg>
                </button>
                <input
                  #quantityInput
                  type="number"
                  value="1"
                  min="1"
                  class="input input-sm input-bordered text-center text-tabular w-16"
                />
                <button 
                  class="btn btn-sm btn-circle btn-ghost"
                  (click)="quantityInput.stepUp()"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Add to Cart Button -->
          <button
            class="btn btn-primary btn-block min-h-[3rem] hover:scale-105 active:scale-95 transition-transform"
            (click)="variantSelected.emit({ variant: product()!.variants[0], quantity: +quantityInput.value })"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
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
            Add to Cart
          </button>
          } @else {
          <!-- Out of Stock Message -->
          <div class="alert alert-error">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <div>
              <div class="font-semibold">Product Unavailable</div>
              <div class="text-sm">This item is currently out of stock and cannot be added to cart.</div>
            </div>
          </div>
          }
          } @else {
          <!-- No Variants -->
          <div class="alert alert-error">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm">No variants available</span>
          </div>
          }
        </div>
      </div>
      <div class="modal-backdrop" (click)="closeModal.emit()"></div>
    </div>
    }
  `,
  styles: `
    .animate-in {
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 639px) {
      .modal-bottom .modal-box {
        width: 100%;
        max-width: 100%;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductConfirmModalComponent {
  readonly currencyService = inject(CurrencyService);

  readonly isOpen = input.required<boolean>();
  readonly product = input.required<ProductSearchResult | null>();

  readonly variantSelected = output<{ variant: ProductVariant; quantity: number }>();
  readonly closeModal = output<void>();
}

