import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  SubscriptionService,
  type SubscriptionTier,
} from '../../../../core/services/subscription.service';
import { PaymentModalComponent } from './payment-modal.component';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-subscription-tiers',
  imports: [CommonModule, PaymentModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card bg-base-100 shadow-lg">
      <div class="card-body space-y-6">
        <div class="flex items-center gap-4">
          <div class="text-4xl">⭐</div>
          <div class="flex-1">
            <h2 class="text-2xl font-bold">Choose Your Plan</h2>
            <p class="text-sm text-base-content/60">Select a subscription tier to continue</p>
          </div>
        </div>

        @if (subscriptionService.isLoading()) {
          <div class="flex justify-center items-center py-12">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
        } @else if (subscriptionService.error()) {
          <div class="alert alert-error">
            <span>{{ subscriptionService.error() }}</span>
          </div>
        } @else if (tiers().length === 0) {
          <div class="text-center py-12">
            <p class="text-base-content/60">No subscription tiers available at this time.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (tier of validTiers(); track tier.id) {
              <div
                class="card bg-base-200 border-2"
                [class.border-primary]="isSelectedTier(tier.id)"
              >
                <div class="card-body">
                  <h3 class="card-title text-xl">{{ tier.name }}</h3>
                  @if (tier.description) {
                    <p class="text-sm text-base-content/70 mt-2">{{ tier.description }}</p>
                  }

                  <!-- Pricing -->
                  <div class="mt-4 space-y-2">
                    <div class="flex items-baseline gap-2">
                      <span class="text-3xl font-bold"
                        >KES {{ tier.priceMonthly / 100 | number: '1.0-0' }}</span
                      >
                      <span class="text-sm text-base-content/60">/month</span>
                    </div>
                    <div class="text-xs text-base-content/60">
                      or KES {{ tier.priceYearly / 100 | number: '1.0-0' }}/year
                    </div>
                  </div>

                  <!-- Features -->
                  @if (getFeaturesList(tier).length > 0) {
                    <div class="mt-4 space-y-2">
                      <h4 class="font-semibold text-sm">Features:</h4>
                      <ul class="space-y-1">
                        @for (feature of getFeaturesList(tier); track feature) {
                          <li class="text-sm flex items-start gap-2">
                            <span class="text-success">✓</span>
                            <span>{{ feature }}</span>
                          </li>
                        }
                      </ul>
                    </div>
                  }

                  <!-- Select Button -->
                  <div class="card-actions mt-6">
                    <button
                      class="btn btn-primary w-full"
                      (click)="selectTier(tier)"
                      [disabled]="subscriptionService.isProcessingPayment()"
                    >
                      @if (
                        subscriptionService.isProcessingPayment() && selectedTierId() === tier.id
                      ) {
                        <span class="loading loading-spinner loading-sm"></span>
                        Processing...
                      } @else {
                        Select Plan
                      }
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>

    <!-- Payment Modal -->
    <app-payment-modal
      [isOpen]="isPaymentModalOpen()"
      [tier]="selectedTier()"
      (closed)="closePaymentModal()"
      (paymentInitiated)="onPaymentInitiated($event)"
    />
  `,
})
export class SubscriptionTiersComponent implements OnInit {
  protected readonly subscriptionService = inject(SubscriptionService);
  protected readonly toastService = inject(ToastService);

  private readonly selectedTierIdSignal = signal<string | null>(null);
  private readonly isPaymentModalOpenSignal = signal(false);

  readonly selectedTierId = this.selectedTierIdSignal.asReadonly();
  readonly isPaymentModalOpen = this.isPaymentModalOpenSignal.asReadonly();

  readonly tiers = this.subscriptionService.tiers;

  /**
   * Helper function to validate tier ID
   */
  private isValidTierId(id: string | null | undefined): boolean {
    if (!id || id === '-1') {
      return false;
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Get only valid tiers (filter out invalid IDs)
   */
  readonly validTiers = computed(() => {
    return this.tiers().filter((tier) => tier && this.isValidTierId(tier.id));
  });

  readonly selectedTier = computed(() => {
    const tierId = this.selectedTierIdSignal();
    if (!tierId || !this.isValidTierId(tierId)) return null;
    return this.validTiers().find((t) => t.id === tierId) || null;
  });

  async ngOnInit() {
    await this.subscriptionService.getSubscriptionTiers();
  }

  isSelectedTier(tierId: string): boolean {
    return this.selectedTierIdSignal() === tierId;
  }

  getFeaturesList(tier: SubscriptionTier): string[] {
    if (!tier.features) return [];
    if (Array.isArray(tier.features)) return tier.features;
    if (tier.features.features && Array.isArray(tier.features.features)) {
      return tier.features.features;
    }
    return [];
  }

  selectTier(tier: SubscriptionTier) {
    // Validate tier exists
    if (!tier) {
      this.toastService.show(
        'Invalid Tier',
        'Please select a valid subscription tier.',
        'error',
        3000,
      );
      return;
    }

    // Validate tier ID exists
    if (!tier.id) {
      this.toastService.show(
        'Invalid Tier',
        'The selected tier has no ID. Please refresh the page and try again.',
        'error',
        3000,
      );
      return;
    }

    // Validate tier ID is not "-1"
    if (tier.id === '-1') {
      this.toastService.show(
        'Invalid Tier',
        'The selected tier has an invalid ID. Please refresh the page and try again.',
        'error',
        3000,
      );
      return;
    }

    // Validate tier ID is a valid UUID format
    if (!this.isValidTierId(tier.id)) {
      this.toastService.show(
        'Invalid Tier',
        'The selected tier has an invalid ID format. Please refresh the page and try again.',
        'error',
        3000,
      );
      return;
    }

    // Ensure tier exists in valid tiers list
    const validTiers = this.validTiers();
    if (!validTiers.find((t) => t.id === tier.id)) {
      this.toastService.show(
        'Invalid Tier',
        'The selected tier is not available. Please refresh the page and try again.',
        'error',
        3000,
      );
      return;
    }

    this.selectedTierIdSignal.set(tier.id);
    this.isPaymentModalOpenSignal.set(true);
  }

  closePaymentModal() {
    this.isPaymentModalOpenSignal.set(false);
    this.selectedTierIdSignal.set(null);
  }

  onPaymentInitiated(event: { reference: string; authorizationUrl?: string }) {
    this.toastService.show(
      'Payment Initiated',
      'Please complete the payment on your phone. We will notify you when payment is confirmed.',
      'info',
      5000,
    );

    // If there's an authorization URL, it will be opened by the payment modal component
    // The modal will handle polling for payment verification
  }
}
