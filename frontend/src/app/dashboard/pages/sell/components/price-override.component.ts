import { ChangeDetectionStrategy, Component, computed, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface PriceOverrideData {
  variantId: string;
  customLinePrice?: number;
  reason?: string;
}

@Component({
  selector: 'app-price-override',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (!canOverridePrices()) {
      <!-- Completely hide price override functionality -->
    } @else {
      @if (isEditing()) {
        <!-- Mobile-optimized edit mode -->
        <div class="flex flex-col gap-3 w-full p-3 bg-base-200 rounded-lg">
          <!-- Quick Adjustments -->
          <div>
            <label class="text-xs font-medium text-base-content/70 mb-2 block">Quick Adjust:</label>
            <div class="grid grid-cols-4 gap-2">
              @for (adj of quickAdjustments(); track adj.label) {
                <button
                  class="btn btn-sm"
                  (click)="applyQuickAdjustment(adj.value)"
                >
                  {{ adj.label }}
                </button>
              }
            </div>
          </div>
          
          <!-- Custom Line Price Input -->
          <div>
            <label class="text-xs font-medium text-base-content/70 mb-1 block">
              Custom Total Price:
            </label>
            <input
              type="number"
              step="1"
              min="0"
              class="input input-bordered w-full text-lg"
              [ngModel]="linePriceInput()"
              (ngModelChange)="updateLinePrice($event)"
              placeholder="0"
            />
            <div class="text-xs text-base-content/50 mt-1">
              {{ formatPreview() }}
            </div>
          </div>
          
          <!-- Reason Input -->
          <div>
            <label class="text-xs font-medium text-base-content/70 mb-1 block">Reason:</label>
            <input
              type="text"
              class="input input-bordered w-full"
              [ngModel]="reasonInput()"
              (ngModelChange)="updateReason($event)"
              placeholder="e.g., Bulk discount"
            />
          </div>
          
          <!-- Action Buttons -->
          <div class="flex gap-2">
            <button class="btn btn-success flex-1" (click)="save()">
              Apply
            </button>
            <button class="btn btn-ghost" (click)="cancel()">
              Cancel
            </button>
          </div>
        </div>
      } @else {
        <!-- Display mode -->
        <div class="flex items-center gap-2">
          <div class="flex-1 text-sm">
            @if (hasOverride()) {
              <span class="text-warning font-semibold">{{ displayPrice() }}</span>
              <span class="text-xs bg-warning/20 px-1 rounded ml-1">custom</span>
              @if (reasonInput()) {
                <div class="text-xs text-warning/70 mt-0.5">{{ reasonInput() }}</div>
              }
            } @else {
              <span class="text-base-content/50">{{ displayPrice() }}</span>
            }
          </div>
          <button class="btn btn-sm btn-ghost" (click)="startEditing()">
            ✏️
          </button>
          @if (hasOverride()) {
            <button class="btn btn-sm btn-error btn-ghost" (click)="remove()">
              ↶
            </button>
          }
        </div>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PriceOverrideComponent implements OnInit {
  // Inputs
  variantId = input.required<string>();
  quantity = input.required<number>();
  originalUnitPrice = input.required<number>();
  customLinePrice = input<number | undefined>(undefined);
  reason = input<string | undefined>(undefined);
  canOverridePrices = input.required<boolean>();

  ngOnInit() {
    // Debug logging for permission check
    console.log('🔍 PriceOverrideComponent: canOverridePrices =', this.canOverridePrices());
  }

  // Outputs
  priceChange = output<PriceOverrideData>();

  // Internal state
  isEditing = signal(false);
  linePriceInput = signal<number | undefined>(undefined);
  reasonInput = signal<string | undefined>(undefined);

  // Computed
  hasOverride = computed(() => !!this.customLinePrice());
  displayPrice = computed(() => {
    const price = this.customLinePrice();
    return price ? this.formatPrice(price / 100) : this.formatPrice(this.originalUnitPrice());
  });

  quickAdjustments = computed(() => {
    const basePrice = this.getBaseLinePrice();
    return [
      { label: '-10%', value: Math.round(basePrice * 0.9) },
      { label: '-5%', value: Math.round(basePrice * 0.95) },
      { label: '+5%', value: Math.round(basePrice * 1.05) },
      { label: '+10%', value: Math.round(basePrice * 1.10) },
    ];
  });

  startEditing(): void {
    this.isEditing.set(true);
    const customPrice = this.customLinePrice();
    if (customPrice) {
      this.linePriceInput.set(customPrice / 100); // Convert cents to currency
    } else {
      this.linePriceInput.set(this.getBaseLinePrice() / 100);
    }
    this.reasonInput.set(this.reason());
  }

  cancel(): void {
    this.isEditing.set(false);
    this.linePriceInput.set(undefined);
    this.reasonInput.set(undefined);
  }

  save(): void {
    const linePrice = this.linePriceInput();
    const reason = this.reasonInput();

    if (linePrice && linePrice > 0) {
      this.priceChange.emit({
        variantId: this.variantId(),
        customLinePrice: Math.round(linePrice * 100), // Convert to cents
        reason
      });
    } else {
      this.priceChange.emit({
        variantId: this.variantId(),
        customLinePrice: undefined,
        reason: undefined
      });
    }

    this.cancel();
  }

  remove(): void {
    this.priceChange.emit({
      variantId: this.variantId(),
      customLinePrice: undefined,
      reason: undefined
    });
  }

  applyQuickAdjustment(priceInCents: number): void {
    this.linePriceInput.set(priceInCents / 100);
  }

  updateLinePrice(value: number): void {
    this.linePriceInput.set(value);
  }

  updateReason(value: string): void {
    this.reasonInput.set(value);
  }

  formatPreview(): string {
    const linePrice = this.linePriceInput();
    if (!linePrice) return '';
    const unitPrice = linePrice / this.quantity();
    return `${this.formatPrice(unitPrice)} × ${this.quantity()} items`;
  }

  private getBaseLinePrice(): number {
    return Math.round(this.originalUnitPrice() * this.quantity() * 100);
  }

  private formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  }
}