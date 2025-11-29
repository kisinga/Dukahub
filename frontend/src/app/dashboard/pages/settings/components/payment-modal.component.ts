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

        <!-- Phone Number Input (for Express Payment) -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Phone Number</span>
            <span class="label-text-alt">For Express Payment via Mobile Money</span>
          </label>
          <input
            type="tel"
            class="input input-bordered"
            [ngModel]="phoneNumber()"
            (ngModelChange)="phoneNumber.set($event)"
            placeholder="+254712345678"
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
        @if (isProcessingPayment()) {
          <div class="flex items-center justify-center py-4">
            <span class="loading loading-spinner loading-lg"></span>
            <span class="ml-2">{{ loadingMessage() || 'Processing payment...' }}</span>
          </div>
        }

        <!-- Payment Actions -->
        <div class="modal-action flex-col gap-2">
          <div class="flex gap-2 w-full">
            <button
              class="btn btn-primary flex-1"
              [disabled]="!phoneNumber() || isProcessingPayment()"
              (click)="initiateExpressPayment()"
            >
              Express Payment
            </button>
            <button
              class="btn btn-outline flex-1"
              [disabled]="isProcessingPayment()"
              (click)="initiateCheckoutPayment()"
            >
              Additional Payment Options
            </button>
          </div>
          <button class="btn btn-ghost w-full" [disabled]="isProcessingPayment()" (click)="close()">
            Cancel
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
  protected readonly isProcessingPayment = signal(false);
  protected readonly loadingMessage = signal<string>('');

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

  private validateTier(): string | null {
    const tier = this.selectedTier();

    // Log tier for debugging
    console.log('[PaymentModal] validateTier called with tier:', tier);

    // Validate tier exists
    if (!tier) {
      console.error('[PaymentModal] No tier selected');
      this.error.set(
        'Please select a valid subscription tier. If this issue persists, please refresh the page.',
      );
      return null;
    }

    // Validate tier ID exists and is not "-1"
    const tierId = tier.id;
    console.log('[PaymentModal] Tier ID:', tierId, 'type:', typeof tierId);

    if (!tierId) {
      console.error('[PaymentModal] Tier ID is missing');
      this.error.set(
        'Invalid subscription tier selected. Please close this modal, refresh the page, and try again.',
      );
      return null;
    }

    // Check for "-1" in all possible forms
    const tierIdStr = String(tierId).trim();
    if (tierIdStr === '-1') {
      console.error('[PaymentModal] CRITICAL: Tier ID is "-1":', { tierId, tierIdStr, tier });
      this.error.set(
        'Invalid subscription tier selected. Please close this modal, refresh the page, and try again.',
      );
      return null;
    }

    // Validate tier ID is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tierIdStr)) {
      console.error('[PaymentModal] Tier ID is not a valid UUID:', tierIdStr);
      this.error.set(
        'Invalid subscription tier ID format. Please close this modal, refresh the page, and try again.',
      );
      return null;
    }

    console.log('[PaymentModal] Tier validation passed, proceeding with tierId:', tierIdStr);
    return tierIdStr;
  }

  async initiateExpressPayment() {
    const tierIdStr = this.validateTier();
    if (!tierIdStr) {
      return;
    }

    const phone = this.phoneNumber();
    if (!phone) {
      this.error.set('Phone number is required for Express Payment');
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
    this.isProcessingPayment.set(true);
    this.loadingMessage.set('Initiating payment...');

    try {
      const tier = this.selectedTier();
      const result = await this.subscriptionService.initiatePurchase(
        tier!.id,
        this.billingCycle(),
        phone,
        email,
        'mobile_money', // Payment method for Express Payment
      );

      if (result.success && result.reference) {
        this.paymentInitiated.emit({
          reference: result.reference,
          authorizationUrl: result.authorizationUrl,
        });

        // If authorizationUrl exists, it means fallback to payment link occurred
        // Redirect to payment page instead of polling
        if (result.authorizationUrl) {
          this.loadingMessage.set('Redirecting to payment page...');
          window.location.href = result.authorizationUrl;
        } else {
          // No authorizationUrl means STK push was successful, poll for verification
          this.loadingMessage.set('Waiting for payment confirmation... (check your phone)');
          await this.pollPaymentStatus(result.reference);
        }
      } else {
        this.error.set(result.message || 'Failed to initiate payment');
        this.isProcessingPayment.set(false);
        this.loadingMessage.set('');
      }
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Failed to initiate payment');
      this.isProcessingPayment.set(false);
      this.loadingMessage.set('');
    }
  }

  async initiateCheckoutPayment() {
    const tierIdStr = this.validateTier();
    if (!tierIdStr) {
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
    this.isProcessingPayment.set(true);
    this.loadingMessage.set('Initiating payment...');

    try {
      const tier = this.selectedTier();
      // Use phone number if available, otherwise use placeholder format
      const phone = this.phoneNumber() || `+254700000000`;

      const result = await this.subscriptionService.initiatePurchase(
        tier!.id,
        this.billingCycle(),
        phone,
        email,
        'checkout', // Payment method for redirect to Paystack checkout
      );

      if (result.success && result.reference) {
        this.paymentInitiated.emit({
          reference: result.reference,
          authorizationUrl: result.authorizationUrl,
        });

        // If there's an authorization URL, redirect to it
        if (result.authorizationUrl) {
          this.loadingMessage.set('Redirecting to payment page...');
          window.location.href = result.authorizationUrl;
        } else {
          this.error.set('Payment link not generated. Please try again.');
          this.isProcessingPayment.set(false);
          this.loadingMessage.set('');
        }
      } else {
        this.error.set(result.message || 'Failed to initiate payment');
        this.isProcessingPayment.set(false);
        this.loadingMessage.set('');
      }
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Failed to initiate payment');
      this.isProcessingPayment.set(false);
      this.loadingMessage.set('');
    }
  }

  private async pollPaymentStatus(reference: string, maxAttempts = 3) {
    // Polling strategy: 3 attempts with 15-second intervals
    // Attempt 1: Immediate (0 seconds)
    // Attempt 2: After 15 seconds
    // Attempt 3: After 30 seconds (total: 45 seconds max)

    try {
      for (let i = 0; i < maxAttempts; i++) {
        // First attempt is immediate, subsequent attempts wait 15 seconds
        if (i > 0) {
          this.loadingMessage.set(`Verifying payment... (attempt ${i + 1} of ${maxAttempts})`);
          await new Promise((resolve) => setTimeout(resolve, 15000)); // Wait 15 seconds
        } else {
          this.loadingMessage.set('Verifying payment...');
        }

        const verified = await this.subscriptionService.verifyPayment(reference);
        if (verified) {
          this.loadingMessage.set('Payment verified successfully!');
          // Small delay to show success message
          await new Promise((resolve) => setTimeout(resolve, 1000));
          this.isProcessingPayment.set(false);
          this.loadingMessage.set('');
          this.close();
          return;
        }
      }

      // If not verified after max attempts, show message
      this.error.set(
        'Payment verification timeout. Your payment may still be processing. Please check your payment status or try refreshing the page.',
      );
      this.isProcessingPayment.set(false);
      this.loadingMessage.set('');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Failed to verify payment');
      this.isProcessingPayment.set(false);
      this.loadingMessage.set('');
    }
  }

  close() {
    // Clear loading state if user cancels
    this.isProcessingPayment.set(false);
    this.loadingMessage.set('');
    this.error.set(null);
    this.closed.emit();
  }
}
