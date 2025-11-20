import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
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

  protected readonly isLoadingAny = computed(
    () => this.isLoading() || this.authService.isLoading(),
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
  private registrationSessionId = signal<string | null>(null); // Store sessionId from OTP request

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

    // Store registration data and request OTP
    this.errorMessage.set(null);
    this.isLoading.set(true);

    try {
      // Get and validate registration data
      const registrationData = this.registrationService.getRegistrationData();
      if (!registrationData) {
        // Re-validate to get specific error messages
        const companyValidation = this.registrationService.validateCompanyInfo();
        const adminValidation = this.registrationService.validateAdminInfo();
        const storeValidation = this.registrationService.validateStoreInfo();

        const errors: string[] = [];
        if (!companyValidation.valid) errors.push(...companyValidation.errors);
        if (!adminValidation.valid) errors.push(...adminValidation.errors);
        if (!storeValidation.valid) errors.push(...storeValidation.errors);

        throw new Error(
          errors.length > 0
            ? `Please complete all required fields: ${errors.join(', ')}`
            : 'Invalid registration data. Please go back and complete all fields.',
        );
      }

      const phoneNumber = this.formattedPhone();
      if (!phoneNumber) {
        throw new Error('Phone number is required. Please go back to step 1.');
      }

      // Prepare registration data for backend
      const registrationPayload = {
        companyName: registrationData.company.companyName.trim(),
        companyCode: registrationData.company.companyCode.trim(),
        currency: registrationData.company.currency,
        adminFirstName: registrationData.admin.firstName.trim(),
        adminLastName: registrationData.admin.lastName.trim(),
        adminPhoneNumber: formatPhoneNumber(registrationData.admin.phoneNumber),
        adminEmail: registrationData.admin.email?.trim() || undefined,
        storeName: registrationData.store.storeName.trim(),
        storeAddress: registrationData.store.storeAddress?.trim() || undefined,
      };

      // NEW: Store registration data and request OTP
      // Backend will store data in Redis and return sessionId
      const result = await this.authService.requestRegistrationOTP(
        phoneNumber,
        registrationPayload,
      );

      if (!result.sessionId) {
        throw new Error('Failed to create registration session. Please try again.');
      }

      // Store sessionId for OTP verification
      this.registrationSessionId.set(result.sessionId);

      // For development: Get OTP from mock service (console.log shows it)
      // In production, OTP will be sent via SMS
      console.log('[DEV] OTP sent. Check browser console for the OTP code.');
      console.log('[DEV] Registration session ID:', result.sessionId);

      this.otpSent.set(true);
      this.currentStep.set(3);
      this.startOTPResendCooldown();
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Failed to send OTP. Please try again.';

      // Check if error indicates existing account
      if (
        errorMsg.toLowerCase().includes('already') ||
        errorMsg.toLowerCase().includes('exists') ||
        errorMsg.toLowerCase().includes('registered')
      ) {
        this.errorMessage.set(
          'An account with this phone number already exists. Please login instead.',
        );
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

    // Validate OTP format (must be 6 digits)
    if (!/^\d{6}$/.test(otpValue)) {
      this.errorMessage.set('OTP must be exactly 6 digits');
      return;
    }

    this.errorMessage.set(null);
    this.isLoading.set(true);

    try {
      // Get sessionId from stored registration request
      const sessionId = this.registrationSessionId();
      if (!sessionId) {
        throw new Error('Registration session expired. Please start registration again.');
      }

      const phoneNumber = this.formattedPhone();
      if (!phoneNumber) {
        throw new Error('Phone number is required. Please go back to step 1.');
      }

      // NEW: Verify OTP using sessionId (registration data is retrieved from Redis)
      // This creates all entities in a transaction
      const result = await this.authService.verifyRegistrationOTP(phoneNumber, otpValue, sessionId);

      if (result.success) {
        // Get registration data for success message (from service)
        const registrationData = this.registrationService.getRegistrationData();
        const companyName = registrationData?.company.companyName || 'Your account';
        const storeName = registrationData?.store.storeName || 'your store';

        const successMsg = `Registration successful! Your account "${companyName}" with store "${storeName}" has been created. Your account is pending admin approval. Redirecting to login...`;

        this.successMessage.set(successMsg);
        this.errorMessage.set(null);

        // Clear OTP code and session
        this.otpCode.set('');
        this.registrationSessionId.set(null);

        // Reset form and redirect to login after 2 seconds
        // User must login separately (tokens can't be assigned during signup)
        setTimeout(() => {
          this.registrationService.reset();
          this.router.navigate(['/login'], {
            queryParams: { registered: 'true' },
          });
        }, 2000);
      } else {
        this.errorMessage.set(result.message || 'Registration failed. Please try again.');
        this.successMessage.set(null);
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Registration failed. Please try again.';

      // Provide user-friendly error messages
      let displayMessage = errorMsg;

      // Check for specific error types
      if (
        errorMsg.toLowerCase().includes('already') ||
        errorMsg.toLowerCase().includes('exists') ||
        errorMsg.toLowerCase().includes('duplicate')
      ) {
        displayMessage = 'An account with this phone number already exists. Please login instead.';
      } else if (
        errorMsg.toLowerCase().includes('otp') ||
        errorMsg.toLowerCase().includes('invalid') ||
        errorMsg.toLowerCase().includes('expired')
      ) {
        displayMessage = 'Invalid or expired OTP code. Please request a new OTP.';
      } else if (
        errorMsg.toLowerCase().includes('network') ||
        errorMsg.toLowerCase().includes('connection') ||
        errorMsg.toLowerCase().includes('fetch')
      ) {
        displayMessage =
          'Unable to connect to server. Please check your internet connection and try again.';
      } else if (
        errorMsg.toLowerCase().includes('company code') ||
        errorMsg.toLowerCase().includes('channel')
      ) {
        displayMessage =
          'Company code is already taken. Please go back and choose a different company name.';
      }

      this.errorMessage.set(displayMessage);
      this.successMessage.set(null);
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
      // Get registration data for resending OTP
      const registrationData = this.registrationService.getRegistrationData();
      if (!registrationData) {
        throw new Error('Registration data not found. Please start registration again.');
      }

      const phoneNumber = this.formattedPhone();
      if (!phoneNumber) {
        throw new Error('Phone number is required.');
      }

      // Prepare registration data for backend
      const registrationPayload = {
        companyName: registrationData.company.companyName.trim(),
        companyCode: registrationData.company.companyCode.trim(),
        currency: registrationData.company.currency,
        adminFirstName: registrationData.admin.firstName.trim(),
        adminLastName: registrationData.admin.lastName.trim(),
        adminPhoneNumber: formatPhoneNumber(registrationData.admin.phoneNumber),
        adminEmail: registrationData.admin.email?.trim() || undefined,
        storeName: registrationData.store.storeName.trim(),
        storeAddress: registrationData.store.storeAddress?.trim() || undefined,
      };

      // Resend OTP with registration data (gets new sessionId)
      const result = await this.authService.requestRegistrationOTP(
        phoneNumber,
        registrationPayload,
      );

      if (!result.sessionId) {
        throw new Error('Failed to create registration session. Please try again.');
      }

      // Update sessionId for OTP verification
      this.registrationSessionId.set(result.sessionId);

      this.otpCode.set('');
      this.startOTPResendCooldown();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Failed to resend OTP. Please try again.',
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
