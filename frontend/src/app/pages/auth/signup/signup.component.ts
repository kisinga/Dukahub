import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { formatPhoneNumber, generateCompanyCode } from '../../../core/utils/phone.utils';

type Step = 1 | 2 | 3;

@Component({
    selector: 'app-signup',
  imports: [RouterLink, FormsModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupComponent implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly registrationService = inject(RegistrationService);
  private readonly router = inject(Router);

  // Form state
  protected readonly currentStep = signal<Step>(1);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly otpSent = signal(false);
  protected readonly otpCode = signal('');
  protected readonly canResendOTP = signal(false);
  protected readonly resendCooldown = signal(0);

  // Form data from service
  protected readonly companyInfo = this.registrationService.companyInfo;
  protected readonly adminInfo = this.registrationService.adminInfo;
  protected readonly storeInfo = this.registrationService.storeInfo;

  // Computed values
  protected readonly formattedPhone = computed(() => {
    const phone = this.adminInfo().phoneNumber;
    return phone ? formatPhoneNumber(phone) : '';
  });

  protected readonly isLoadingAny = computed(() =>
    this.isLoading() || this.authService.isLoading()
  );

  // Step 1: Company & Admin Info
  protected companyName = '';
  protected companyCode = '';
  protected adminFirstName = '';
  protected adminLastName = '';
  protected adminPhone = '';
  protected adminEmail = '';

  // Step 2: Store Info
  protected storeName = '';
  protected storeAddress = '';

  // Step 3: OTP
  private otpTimer: any = null;
  protected readonly displayedOTP = signal<string | null>(null); // For development - shows OTP on screen

  ngOnDestroy(): void {
    if (this.otpTimer) {
      clearInterval(this.otpTimer);
    }
  }

  protected async onStep1Next(): Promise<void> {
    // Auto-generate company code if not set
    if (!this.companyCode) {
      this.companyCode = generateCompanyCode(this.companyName);
    }

    // Update service with step 1 data (currency is always KES)
    this.registrationService.setCompanyInfo({
      companyName: this.companyName.trim(),
      companyCode: this.companyCode.trim(),
      currency: 'KES', // Static currency
    });

    this.registrationService.setAdminInfo({
      firstName: this.adminFirstName.trim(),
      lastName: this.adminLastName.trim(),
      phoneNumber: this.adminPhone.trim(),
      email: this.adminEmail.trim() || undefined,
    });

    // Validate
    const companyValidation = this.registrationService.validateCompanyInfo();
    const adminValidation = this.registrationService.validateAdminInfo();

    if (!companyValidation.valid) {
      this.errorMessage.set(companyValidation.errors.join('. '));
      return;
    }

    if (!adminValidation.valid) {
      this.errorMessage.set(adminValidation.errors.join('. '));
      return;
    }

    this.errorMessage.set(null);
    this.currentStep.set(2);
  }

  protected async onStep2Next(): Promise<void> {
    // Update service with step 2 data
    this.registrationService.setStoreInfo({
      storeName: this.storeName.trim(),
      storeAddress: this.storeAddress.trim() || undefined,
    });

    // Validate
    const storeValidation = this.registrationService.validateStoreInfo();

    if (!storeValidation.valid) {
      this.errorMessage.set(storeValidation.errors.join('. '));
      return;
    }

    // Check if phone number already exists (mock check - backend will do real check)
    this.errorMessage.set(null);
    this.isLoading.set(true);

    try {
      const phoneNumber = this.formattedPhone();

      // TODO: Replace with actual backend check when ready
      // For now, we'll let the backend handle this during verification

      const result = await this.authService.requestRegistrationOTP(phoneNumber);

      // For development: Get OTP from mock service (console.log shows it)
      // In production, OTP will be sent via SMS
      console.log('[DEV] OTP sent. Check browser console for the OTP code.');

      // In development, we can show OTP on screen for testing
      // This will be removed when backend is ready
      if (typeof window !== 'undefined' && window.localStorage) {
        // Try to get from mock service (for dev display only)
        setTimeout(() => {
          // OTP is logged to console by mock service
          // User should check console for the 6-digit code
        }, 100);
      }

      this.otpSent.set(true);
      this.currentStep.set(3);
      this.startOTPResendCooldown();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to send OTP. Please try again.';

      // Check if error indicates existing account
      if (errorMsg.toLowerCase().includes('already') || errorMsg.toLowerCase().includes('exists') || errorMsg.toLowerCase().includes('registered')) {
        this.errorMessage.set('An account with this phone number already exists. Please login instead.');
      } else {
        this.errorMessage.set(errorMsg);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async onStep3Submit(): Promise<void> {
    const otpValue = this.otpCode().trim();
    if (!otpValue || otpValue.length !== 6) {
      this.errorMessage.set('Please enter a valid 6-digit OTP code');
      return;
    }

    this.errorMessage.set(null);
    this.isLoading.set(true);

    try {
      const registrationData = this.registrationService.getRegistrationData();
      if (!registrationData) {
        throw new Error('Invalid registration data. Please go back and complete all fields.');
      }

      const phoneNumber = this.formattedPhone();

      // Check for existing account before verifying OTP
      // This will be handled by backend, but we can show user-friendly message

      const result = await this.authService.verifyRegistrationOTP(
        phoneNumber,
        otpValue,
        registrationData
      );

      if (result.success) {
        this.successMessage.set('Registration successful! Your account is pending admin approval. You will be redirected to login...');

        // Clear OTP code
        this.otpCode.set('');

        // Reset form after 3 seconds and redirect to login
        setTimeout(() => {
          this.registrationService.reset();
          this.router.navigate(['/login'], {
            queryParams: { registered: 'true' }
          });
        }, 3000);
      } else {
        this.errorMessage.set(result.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Registration failed. Please try again.';

      // Check if error indicates existing account
      if (errorMsg.toLowerCase().includes('already') || errorMsg.toLowerCase().includes('exists') || errorMsg.toLowerCase().includes('registered')) {
        this.errorMessage.set('An account with this phone number already exists. Please login instead.');
      } else {
        this.errorMessage.set(errorMsg);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async onResendOTP(): Promise<void> {
    if (!this.canResendOTP() || this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const phoneNumber = this.formattedPhone();
      await this.authService.requestRegistrationOTP(phoneNumber);

      this.otpCode.set('');
      this.startOTPResendCooldown();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Failed to resend OTP. Please try again.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  protected goToStep(step: Step): void {
    if (step < this.currentStep() || (step === 3 && !this.otpSent())) {
      return;
    }
    this.currentStep.set(step);
    this.errorMessage.set(null);
  }

  protected goBack(): void {
    if (this.currentStep() > 1) {
      this.currentStep.set((this.currentStep() - 1) as Step);
      this.errorMessage.set(null);
    }
  }

  protected onCompanyNameChange(): void {
    // Auto-generate company code whenever company name changes
    if (this.companyName.trim()) {
      this.companyCode = generateCompanyCode(this.companyName);
    }
  }

  private startOTPResendCooldown(): void {
    this.canResendOTP.set(false);
    this.resendCooldown.set(60); // 60 seconds cooldown

    if (this.otpTimer) {
      clearInterval(this.otpTimer);
    }

    this.otpTimer = setInterval(() => {
      const remaining = this.resendCooldown();
      if (remaining <= 1) {
        this.canResendOTP.set(true);
        this.resendCooldown.set(0);
        clearInterval(this.otpTimer);
      } else {
        this.resendCooldown.set(remaining - 1);
      }
    }, 1000);
  }

  protected onOTPInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 6);
    this.otpCode.set(value);

    // Auto-submit when 6 digits entered
    if (value.length === 6) {
      this.onStep3Submit();
    }
  }
}
