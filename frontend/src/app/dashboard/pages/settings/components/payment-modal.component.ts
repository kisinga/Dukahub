import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  SubscriptionService,
  type SubscriptionTier,
} from '../../../../core/services/subscription.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CompanyService } from '../../../../core/services/company.service';

@Component({
  selector: 'app-payment-modal',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #paymentModal class="modal" [class.modal-open]="isOpen()">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4">Subscribe to {{ selectedTier()?.name || 'Plan' }}</h3>

        <!-- Billing Cycle Selection -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Billing Cycle</span>
          </label>
          <div class="join">
            <button
              class="join-item btn"
              [class.btn-active]="billingCycle() === 'monthly'"
              (click)="billingCycle.set('monthly')"
            >
              Monthly
            </button>
            <button
              class="join-item btn"
              [class.btn-active]="billingCycle() === 'yearly'"
              (click)="billingCycle.set('yearly')"
            >
              Yearly
              @if (selectedTier()) {
                <span class="badge badge-success ml-2">Save {{ yearlyDiscount() }}%</span>
              }
            </button>
          </div>
        </div>

        <!-- Price Display -->
        @if (selectedTier()) {
          <div class="card bg-base-200 mb-4">
            <div class="card-body p-4">
              <div class="flex justify-between items-center">
                <span class="text-sm">Total Amount</span>
                <span class="text-2xl font-bold"> KES {{ price() | number: '1.2-2' }} </span>
              </div>
              <div class="text-xs text-base-content/60 mt-1">
                @if (billingCycle() === 'monthly') {
                  Billed monthly
                } @else {
                  Billed annually
                }
              </div>
            </div>
          </div>
        }

        <!-- Phone Number Input -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Phone Number</span>
          </label>
          <input
            type="tel"
            class="input input-bordered"
            [ngModel]="phoneNumber()"
            (ngModelChange)="phoneNumber.set($event)"
            placeholder="+254712345678"
            required
          />
          <label class="label">
            <span class="label-text-alt">We'll send a payment request to this number</span>
          </label>
        </div>

        <!-- Error Message -->
        @if (error()) {
          <div class="alert alert-error mb-4">
            <span>{{ error() }}</span>
          </div>
        }

        <!-- Loading State -->
        @if (subscriptionService.isProcessingPayment()) {
          <div class="flex items-center justify-center py-4">
            <span class="loading loading-spinner loading-lg"></span>
            <span class="ml-2">Processing payment...</span>
          </div>
        }

        <!-- Payment Actions -->
        <div class="modal-action">
          <button class="btn btn-ghost" (click)="close()">Cancel</button>
          <button
            class="btn btn-primary"
            [disabled]="!phoneNumber() || subscriptionService.isProcessingPayment()"
            (click)="initiatePayment()"
          >
            Pay with Paystack
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" (click)="close()">
        <button>close</button>
      </form>
    </dialog>
  `,
})
export class PaymentModalComponent implements OnInit {
  protected readonly subscriptionService = inject(SubscriptionService);
  protected readonly authService = inject(AuthService);
  protected readonly companyService = inject(CompanyService);

  isOpen = input<boolean>(false);
  tier = input<SubscriptionTier | null>(null);
  closed = output<void>();
  paymentInitiated = output<{ reference: string; authorizationUrl?: string }>();

  protected readonly billingCycle = signal<'monthly' | 'yearly'>('monthly');
  protected readonly phoneNumber = signal<string>('');
  protected readonly error = signal<string | null>(null);

  protected readonly selectedTier = computed(() => this.tier());
  protected readonly price = computed(() => {
    const tier = this.selectedTier();
    if (!tier) return 0;
    return this.billingCycle() === 'monthly' ? tier.priceMonthly / 100 : tier.priceYearly / 100;
  });

  protected readonly yearlyDiscount = computed(() => {
    const tier = this.selectedTier();
    if (!tier) return 0;
    const monthlyTotal = tier.priceMonthly * 12;
    const discount = ((monthlyTotal - tier.priceYearly) / monthlyTotal) * 100;
    return Math.round(discount);
  });

  async ngOnInit() {
    // Pre-fill phone number from user profile
    const user = this.authService.user();
    const identifier = user?.user?.identifier;
    if (identifier) {
      this.phoneNumber.set(identifier);
    }
  }

  async initiatePayment() {
    const tier = this.selectedTier();

    // Log tier for debugging
    console.log('[PaymentModal] initiatePayment called with tier:', tier);

    // Validate tier exists
    if (!tier) {
      console.error('[PaymentModal] No tier selected');
      this.error.set(
        'Please select a valid subscription tier. If this issue persists, please refresh the page.',
      );
      return;
    }

    // Validate tier ID exists and is not "-1"
    const tierId = tier.id;
    console.log('[PaymentModal] Tier ID:', tierId, 'type:', typeof tierId);

    if (!tierId) {
      console.error('[PaymentModal] Tier ID is missing');
      this.error.set(
        'Invalid subscription tier selected. Please close this modal, refresh the page, and try again.',
      );
      return;
    }

    // Check for "-1" in all possible forms
    const tierIdStr = String(tierId).trim();
    if (tierIdStr === '-1') {
      console.error('[PaymentModal] CRITICAL: Tier ID is "-1":', { tierId, tierIdStr, tier });
      this.error.set(
        'Invalid subscription tier selected. Please close this modal, refresh the page, and try again.',
      );
      return;
    }

    // Validate tier ID is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tierIdStr)) {
      console.error('[PaymentModal] Tier ID is not a valid UUID:', tierIdStr);
      this.error.set(
        'Invalid subscription tier ID format. Please close this modal, refresh the page, and try again.',
      );
      return;
    }

    console.log('[PaymentModal] Tier validation passed, proceeding with tierId:', tierIdStr);

    const phone = this.phoneNumber();
    if (!phone) {
      this.error.set('Phone number is required');
      return;
    }

    const user = this.authService.user();
    const email = user?.emailAddress || '';

    if (!email) {
      this.error.set('Email address is required');
      return;
    }

    // Validate channel ID
    const channelId = this.companyService.activeCompanyId();
    if (!channelId) {
      this.error.set('No active channel. Please refresh the page and try again.');
      return;
    }

    this.error.set(null);

    const result = await this.subscriptionService.initiatePurchase(
      tier.id,
      this.billingCycle(),
      phone,
      email,
    );

    if (result.success && result.reference) {
      this.paymentInitiated.emit({
        reference: result.reference,
        authorizationUrl: result.authorizationUrl,
      });

      // If there's an authorization URL, open it
      if (result.authorizationUrl) {
        window.open(result.authorizationUrl, '_blank');
      }

      // Start polling for payment verification
      this.pollPaymentStatus(result.reference);
    } else {
      this.error.set(result.message || 'Failed to initiate payment');
    }
  }

  private async pollPaymentStatus(reference: string, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

      const verified = await this.subscriptionService.verifyPayment(reference);
      if (verified) {
        this.close();
        return;
      }
    }

    // If not verified after max attempts, show message
    this.error.set('Payment verification timeout. Please check your payment status.');
  }

  close() {
    this.closed.emit();
  }
}
