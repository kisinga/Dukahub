import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { CurrencyService } from '../../../../core/services/currency.service';
import { PriceOverrideData } from './price-override.component';

export interface CartItemData {
  variant: {
    id: string;
    name: string;
    productName: string;
    priceWithTax: number;
  };
  quantity: number;
  subtotal: number;
  customLinePrice?: number;
  priceOverrideReason?: string;
}

@Component({
  selector: 'app-cart-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card bg-base-100 shadow-sm border border-base-300">
      <div class="card-body p-2">
        <!-- Flex container that wraps on small screens -->
        <div class="flex items-center gap-2 text-sm flex-wrap sm:flex-nowrap">
          <!-- First Line: Product Info + Remove (on small screens) -->
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <!-- Remove Button -->
            <button
              class="btn btn-circle btn-ghost btn-xs flex-shrink-0 text-error hover:bg-error/10"
              (click)="removeItem.emit(item().variant.id)"
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

            <!-- Product Info -->
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-sm leading-tight truncate">
                {{ item().variant.productName }}
              </div>
              @if (item().variant.name !== item().variant.productName) {
                <div class="text-xs text-base-content/60 leading-tight truncate">
                  {{ item().variant.name }}
                </div>
              }
            </div>
          </div>

          <!-- Second Line: All Controls (on small screens) -->
          <div class="flex items-center gap-2 flex-1 sm:flex-none">
            <!-- Quantity Controls -->
            <div class="flex items-center gap-1 flex-shrink-0">
              <button
                class="btn btn-square btn-xs"
                (click)="decreaseQuantity()"
                [disabled]="item().quantity <= 1"
                aria-label="Decrease quantity"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                </svg>
              </button>
              <span class="w-8 text-center font-semibold">{{ item().quantity }}</span>
              <button
                class="btn btn-square btn-xs"
                (click)="increaseQuantity()"
                aria-label="Increase quantity"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            <!-- Price Adjustment Controls -->
            @if (canOverridePrices()) {
              <div class="flex items-center gap-1 flex-shrink-0 ml-auto">
                <button
                  class="btn btn-square btn-xs btn-ghost"
                  (click)="decreasePrice()"
                  aria-label="Decrease price by 3%"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div class="text-center min-w-[4rem]">
                  <div
                    class="text-lg font-bold text-primary"
                    [class.text-warning]="isPriceOverridden()"
                  >
                    {{ getFormattedLinePrice() }}
                  </div>
                  <div class="text-xs text-base-content/50">
                    @{{ getFormattedPerItemPrice() }}
                  </div>
                </div>
                <button
                  class="btn btn-square btn-xs btn-ghost"
                  (click)="increasePrice()"
                  aria-label="Increase price by 3%"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              </div>
            } @else {
              <!-- Display Price Only (No Adjustment Controls) -->
              <div class="text-center min-w-[4rem] flex-shrink-0 ml-auto">
                <div class="text-lg font-bold text-primary">
                  {{ getFormattedLinePrice() }}
                </div>
                <div class="text-xs text-base-content/50">
                  @{{ getFormattedPerItemPrice() }}
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartItemComponent {
  // Inputs
  item = input.required<CartItemData>();
  canOverridePrices = input.required<boolean>();

  // Outputs
  quantityChange = output<{ variantId: string; quantity: number }>();
  priceChange = output<PriceOverrideData>();
  removeItem = output<string>();

  // Services
  currencyService = inject(CurrencyService);

  // Computed
  isPriceOverridden = computed(() => this.item().customLinePrice !== undefined);

  onPriceChange(data: PriceOverrideData): void {
    this.priceChange.emit(data);
  }

  increaseQuantity(): void {
    this.quantityChange.emit({
      variantId: this.item().variant.id,
      quantity: this.item().quantity + 1
    });

    // Reset custom line price when quantity changes
    if (this.item().customLinePrice !== undefined) {
      this.priceChange.emit({
        variantId: this.item().variant.id,
        customLinePrice: undefined,
        reason: 'Quantity changed - reset price'
      });
    }
  }

  decreaseQuantity(): void {
    if (this.item().quantity > 1) {
      this.quantityChange.emit({
        variantId: this.item().variant.id,
        quantity: this.item().quantity - 1
      });

      // Reset custom line price when quantity changes
      if (this.item().customLinePrice !== undefined) {
        this.priceChange.emit({
          variantId: this.item().variant.id,
          customLinePrice: undefined,
          reason: 'Quantity changed - reset price'
        });
      }
    }
  }

  increasePrice(): void {
    if (!this.canOverridePrices()) return;

    // Get current line total in cents
    const currentLineTotalCents = this.item().customLinePrice || Math.round(this.item().subtotal * 100);

    // Apply 3% increase in cents, then round to nearest whole number
    const newLineTotalCents = Math.round(currentLineTotalCents * 1.03);

    this.priceChange.emit({
      variantId: this.item().variant.id,
      customLinePrice: newLineTotalCents,
      reason: '3% increase'
    });
  }

  decreasePrice(): void {
    if (!this.canOverridePrices()) return;

    // Get current line total in cents
    const currentLineTotalCents = this.item().customLinePrice || Math.round(this.item().subtotal * 100);

    // Apply 3% decrease in cents, then round to nearest whole number
    const newLineTotalCents = Math.round(currentLineTotalCents * 0.97);

    this.priceChange.emit({
      variantId: this.item().variant.id,
      customLinePrice: newLineTotalCents,
      reason: '3% decrease'
    });
  }

  getFormattedLinePrice(): string {
    // If custom line price exists (in cents), use it directly
    if (this.item().customLinePrice !== undefined) {
      return this.currencyService.format(this.item().customLinePrice!, false);
    }
    // Otherwise, use the calculated subtotal (convert to cents)
    return this.currencyService.format(Math.round(this.item().subtotal * 100), false);
  }

  getFormattedPerItemPrice(): string {
    // If custom line price exists, calculate per-item price in cents
    if (this.item().customLinePrice !== undefined) {
      return this.currencyService.format(Math.round(this.item().customLinePrice! / this.item().quantity), false);
    }
    // Otherwise, use the original variant price (convert to cents)
    return this.currencyService.format(Math.round(this.item().variant.priceWithTax * 100), false);
  }

  getFormattedBasePrice(): string {
    // Always show the original base price
    return this.currencyService.format(Math.round(this.item().variant.priceWithTax * 100), false);
  }
}