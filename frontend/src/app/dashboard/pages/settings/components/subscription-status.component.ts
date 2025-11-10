import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { CompanyService } from '../../../../core/services/company.service';
import { SubscriptionService } from '../../../../core/services/subscription.service';

@Component({
    selector: 'app-subscription-status',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="card bg-base-100 shadow-lg">
      <div class="card-body space-y-6">
        
        <!-- Subscription Status Header -->
        <div class="flex items-center gap-4">
          <div class="text-4xl">💳</div>
          <div class="flex-1">
            <h2 class="text-2xl font-bold">Subscription Status</h2>
            <p class="text-sm text-base-content/60">Manage your subscription and billing</p>
          </div>
          @if (subscriptionService.isExpired()) {
            <button class="btn btn-primary" (click)="openPaymentModal()">Renew Now</button>
          }
        </div>

        <!-- Status Badge -->
        <div class="flex items-center gap-3">
          @if (subscriptionService.isTrialActive()) {
            <div class="badge badge-info badge-lg gap-2">
              <span class="w-2 h-2 bg-info-content rounded-full animate-pulse"></span>
              Trial Active
            </div>
            @if (daysRemaining() !== null) {
              <span class="text-sm text-base-content/70">
                {{ daysRemaining() }} days remaining
              </span>
            }
          } @else if (subscriptionService.isSubscriptionActive()) {
            <div class="badge badge-success badge-lg gap-2">
              <span class="w-2 h-2 bg-success-content rounded-full"></span>
              Active Subscription
            </div>
            @if (subscriptionService.subscriptionStatus()?.daysRemaining) {
              <span class="text-sm text-base-content/70">
                Renews in {{ subscriptionService.subscriptionStatus()?.daysRemaining }} days
              </span>
            }
          } @else if (subscriptionService.isExpired()) {
            <div class="badge badge-error badge-lg gap-2">
              <span class="w-2 h-2 bg-error-content rounded-full"></span>
              Subscription Expired
            </div>
            <span class="text-sm text-error">Please renew to continue using all features</span>
          }
        </div>

        <!-- Trial Information -->
        @if (subscriptionService.isTrialActive()) {
          <div class="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <h3 class="font-bold">Trial Period</h3>
              <div class="text-xs">Your trial ends on {{ trialEndsAt() | date:'medium' }}</div>
              <div class="text-xs mt-1">Subscribe now to continue using all features after your trial ends.</div>
            </div>
          </div>
        }

        <!-- Expired Warning -->
        @if (subscriptionService.isExpired()) {
          <div class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 class="font-bold">Subscription Expired</h3>
              <div class="text-xs">Your subscription has expired. You can view data but cannot create or edit.</div>
              <div class="text-xs mt-1">Renew your subscription to regain full access.</div>
            </div>
          </div>
        }

        <!-- Active Subscription Details -->
        @if (subscriptionService.isSubscriptionActive() && subscriptionService.subscriptionStatus()) {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="card bg-base-200">
              <div class="card-body p-4">
                <h3 class="font-semibold text-sm">Current Plan</h3>
                <p class="text-2xl font-bold mt-1">{{ currentTierName() }}</p>
                <p class="text-xs text-base-content/60 mt-1">{{ billingCycle() }}</p>
              </div>
            </div>
            <div class="card bg-base-200">
              <div class="card-body p-4">
                <h3 class="font-semibold text-sm">Next Billing Date</h3>
                <p class="text-lg font-semibold mt-1">
                  {{ subscriptionExpiresAt() | date:'mediumDate' }}
                </p>
                <p class="text-xs text-base-content/60 mt-1">
                  @if (subscriptionService.subscriptionStatus()?.daysRemaining) {
                    {{ subscriptionService.subscriptionStatus()?.daysRemaining }} days remaining
                  }
                </p>
              </div>
            </div>
          </div>
        }

        <!-- Action Buttons -->
        <div class="flex gap-3">
          @if (!subscriptionService.isExpired()) {
            <button class="btn btn-outline" (click)="openPaymentModal()">
              Upgrade Plan
            </button>
            <button class="btn btn-ghost" (click)="cancelSubscription()">
              Cancel Subscription
            </button>
          } @else {
            <button class="btn btn-primary" (click)="openPaymentModal()">
              Renew Subscription
            </button>
          }
        </div>

      </div>
    </div>
  `,
})
export class SubscriptionStatusComponent implements OnInit {
    protected readonly companyService = inject(CompanyService);
    protected readonly subscriptionService = inject(SubscriptionService);

    protected readonly daysRemaining = computed(() => {
        const status = this.subscriptionService.subscriptionStatus();
        return status?.daysRemaining ?? null;
    });

    protected readonly trialEndsAt = computed(() => {
        return this.companyService.trialEndsAt();
    });

    protected readonly subscriptionExpiresAt = computed(() => {
        return this.companyService.subscriptionExpiresAt();
    });

    protected readonly currentTierName = computed(() => {
        // This would need to fetch from subscription details
        return 'Basic Plan';
    });

    protected readonly billingCycle = computed(() => {
        // This would need to fetch from subscription details
        return 'Monthly';
    });

    async ngOnInit() {
        await this.subscriptionService.checkSubscriptionStatus();
        await this.subscriptionService.getSubscriptionTiers();
    }

    openPaymentModal() {
        // This will be handled by parent component or service
        // For now, emit event or use service method
        console.log('Open payment modal');
    }

    async cancelSubscription() {
        if (confirm('Are you sure you want to cancel your subscription? This will disable auto-renewal.')) {
            const success = await this.subscriptionService.cancelSubscription();
            if (success) {
                await this.subscriptionService.checkSubscriptionStatus();
            }
        }
    }
}






