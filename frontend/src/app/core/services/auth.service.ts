import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ReplaySubject, firstValueFrom } from 'rxjs';
import type {
  RequestLoginOtpMutation,
  RequestLoginOtpMutationVariables,
  RequestRegistrationOtpMutation,
  RequestRegistrationOtpMutationVariables,
  VerifyLoginOtpMutation,
  VerifyLoginOtpMutationVariables,
  VerifyRegistrationOtpMutation,
  VerifyRegistrationOtpMutationVariables
} from '../graphql/generated/graphql';
import { Permission } from '../graphql/generated/graphql';
import {
  GET_ACTIVE_ADMIN,
  LOGIN,
  LOGOUT,
  REQUEST_LOGIN_OTP,
  REQUEST_REGISTRATION_OTP,
  VERIFY_LOGIN_OTP,
  VERIFY_REGISTRATION_OTP
} from '../graphql/operations.graphql';
import type {
  ActiveAdministrator,
  GetActiveAdministratorQuery,
  LoginMutation,
  LoginMutationVariables,
  LogoutMutation
} from '../models/user.model';
import { formatPhoneNumber } from '../utils/phone.utils';
import { ApolloService } from './apollo.service';
import { CompanyService } from './company.service';
import type { RegistrationData } from './registration.service';

/**
 * Global authentication service for admin users
 * Manages administrator authentication state, login/logout operations, and session management
 * 
 * Note: Uses admin-api endpoint for authentication
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apolloService = inject(ApolloService);
  private readonly companyService = inject(CompanyService);
  private readonly router = inject(Router);

  // Authentication state signals
  private readonly userSignal = signal<ActiveAdministrator | null>(null);
  private readonly isLoadingSignal = signal<boolean>(false);

  // ReplaySubject for initialization - emits once and caches for late subscribers
  private readonly initialized$ = new ReplaySubject<boolean>(1);

  // Public computed signals
  readonly user = this.userSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly fullName = computed(() => {
    const user = this.userSignal();
    if (!user) return 'Loading...';
    return `${user.firstName} ${user.lastName}`.trim() || user.emailAddress;
  });

  readonly hasUpdateSettingsPermission = computed(() => {
    const user = this.userSignal();
    if (!user?.user?.roles) return false;

    // Check if user has UpdateSettings permission in ANY role
    const hasPermission = user.user.roles.some(role =>
      role.permissions.includes(Permission.UpdateSettings)
    );

    console.log('🔐 Permission check:', {
      user: user?.firstName,
      roles: user?.user?.roles?.map(r => ({ code: r.code, permissions: r.permissions })),
      hasPermission
    });

    return hasPermission;
  });

  readonly hasOverridePricePermission = computed(() => {
    const user = this.userSignal();
    if (!user?.user?.roles) return false;

    // Check if user has OverridePrice permission in ANY role
    const hasPermission = user.user.roles.some(role =>
      role.permissions.includes(Permission.OverridePrice)
    );

    console.log('🔐 OverridePrice permission check:', {
      user: user?.firstName,
      roles: user?.user?.roles?.map(r => ({ code: r.code, permissions: r.permissions })),
      hasPermission
    });

    return hasPermission;
  });

  constructor() {
    // Register session expiration handler with Apollo service
    this.apolloService.onSessionExpired(() => {
      this.handleSessionExpired();
    });

    this.initializeAuth();
  }

  /**
   * Wait for initial authentication check to complete
   * Uses ReplaySubject to handle multiple subscribers gracefully
   */
  async waitForInitialization(): Promise<void> {
    await firstValueFrom(this.initialized$);
  }

  /**
   * Initialize authentication by checking for existing session
   * Admin-api uses cookie-based sessions, not JWT tokens
   */
  private async initializeAuth(): Promise<void> {
    try {
      await this.fetchActiveAdministrator();
    } finally {
      this.initialized$.next(true);
      this.initialized$.complete();
    }
  }


  /**
   * Fetch the currently authenticated administrator
   * Also fetches user channels on initialization to restore state
   */
  private async fetchActiveAdministrator(): Promise<void> {
    try {
      const client = this.apolloService.getClient();

      // Add timeout to prevent hanging indefinitely
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 5000); // 5 second timeout (reduced for faster failure)
      });

      const queryPromise = client.query<GetActiveAdministratorQuery>({
        query: GET_ACTIVE_ADMIN,
        fetchPolicy: 'network-only',
        context: { skipChannelToken: true },
        errorPolicy: 'all', // Return partial results even on error
      });

      const result = await Promise.race([queryPromise, timeoutPromise]);
      const { data } = result;

      if (data?.activeAdministrator) {
        // Use the generated type directly - it's the source of truth
        this.userSignal.set(data.activeAdministrator);
        console.log('✅ Active admin fetched, now restoring session...');

        // CRITICAL: Restore session BEFORE fetching channels
        // This prevents fetchUserChannels from resetting to first company
        this.companyService.initializeFromStorage();

        // Fetch user channels asynchronously (non-blocking) to restore channel state
        // This ensures channels are available even on hard refresh, but doesn't block initialization
        this.companyService.fetchUserChannels().catch(error => {
          console.warn('Failed to fetch user channels (non-critical):', error);
          // Don't fail initialization if channel fetch fails
        });
      } else {
        // No administrator data means not authenticated
        this.userSignal.set(null);
      }
    } catch (error: any) {
      console.error('Failed to fetch active administrator:', error);

      // Always set user to null on error to prevent hanging
      // This ensures the auth guard can make a decision
      this.userSignal.set(null);

      // Don't throw - initialization must complete so guards can proceed
      // This allows the app to load even if backend is unavailable
    }
  }

  /**
   * Check if an error is authentication-related
   */
  private isAuthError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;

    // Check GraphQL errors
    if ('graphQLErrors' in error && Array.isArray((error as any).graphQLErrors)) {
      const graphQLErrors = (error as any).graphQLErrors;
      return graphQLErrors.some((err: any) =>
        err.extensions?.code === 'FORBIDDEN' ||
        err.extensions?.code === 'UNAUTHORIZED' ||
        err.message?.includes('not authorized') ||
        err.message?.includes('not authenticated')
      );
    }

    // Check network errors
    if ('networkError' in error) {
      const networkError = (error as any).networkError;
      return networkError?.statusCode === 401 || networkError?.statusCode === 403;
    }

    return false;
  }

  /**
   * Login with phone number and OTP (passwordless)
   * This is the new primary login method
   */
  async loginWithOTP(phoneNumber: string, otp: string): Promise<void> {
    this.isLoadingSignal.set(true);
    try {
      const client = this.apolloService.getClient();

      // Verify OTP and get session token
      const verifyResult = await client.mutate<VerifyLoginOtpMutation, VerifyLoginOtpMutationVariables>({
        mutation: VERIFY_LOGIN_OTP,
        variables: { phoneNumber, otp: otp.trim() },
        context: { skipChannelToken: true },
      });

      const verifyData = verifyResult.data?.verifyLoginOTP;
      if (!verifyData) {
        throw new Error('No response from server. Please try again.');
      }

      if (!verifyData.success || !verifyData.token) {
        throw new Error(verifyData.message || 'OTP verification failed');
      }

      // Use token to complete login
      // Ensure phone number is normalized for login (must match format used during OTP verification)
      const normalizedPhone = formatPhoneNumber(phoneNumber);
      console.log('[AUTH SERVICE] Attempting login with:', {
        username: normalizedPhone,
        originalPhone: phoneNumber,
        tokenPrefix: verifyData.token?.substring(0, 20),
        tokenLength: verifyData.token?.length,
      });

      const loginResult = await client.mutate<LoginMutation, LoginMutationVariables>({
        mutation: LOGIN,
        variables: {
          username: normalizedPhone,
          password: verifyData.token,
          rememberMe: false,
        },
        context: { skipChannelToken: true },
      });

      const loginData = loginResult.data?.login;
      if (!loginData || 'errorCode' in loginData) {
        throw new Error(loginData?.message || 'Login failed');
      }

      await this.fetchActiveAdministrator();

    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error details:', {
        message: error?.message,
        graphQLErrors: error?.graphQLErrors,
        networkError: error?.networkError,
      });

      // Extract error message from various sources
      const errorMessage =
        error?.graphQLErrors?.[0]?.message ||
        error?.networkError?.message ||
        error?.message ||
        'Login failed. Please try again.';

      throw new Error(errorMessage);
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Request login OTP
   */
  async requestLoginOTP(phoneNumber: string): Promise<{ success: boolean; message: string; expiresAt?: number }> {
    try {
      const client = this.apolloService.getClient();
      const result = await client.mutate<RequestLoginOtpMutation, RequestLoginOtpMutationVariables>({
        mutation: REQUEST_LOGIN_OTP,
        variables: { phoneNumber },
        context: { skipChannelToken: true },
      });

      const data = result.data?.requestLoginOTP;
      if (!data || !data.success) {
        throw new Error(data?.message || 'Failed to request OTP');
      }

      return {
        success: data.success,
        message: data.message,
        expiresAt: data.expiresAt ?? undefined,
      };
    } catch (error: any) {
      const errorMessage =
        error?.graphQLErrors?.[0]?.message ||
        error?.message ||
        'Failed to request OTP';
      throw new Error(errorMessage);
    }
  }

  /**
   * Request registration OTP
   */
  async requestRegistrationOTP(phoneNumber: string): Promise<{ success: boolean; message: string; expiresAt?: number }> {
    try {
      const client = this.apolloService.getClient();
      const result = await client.mutate<RequestRegistrationOtpMutation, RequestRegistrationOtpMutationVariables>({
        mutation: REQUEST_REGISTRATION_OTP,
        variables: { phoneNumber },
        context: { skipChannelToken: true },
      });

      const data = result.data?.requestRegistrationOTP;
      if (!data || !data.success) {
        throw new Error(data?.message || 'Failed to request OTP');
      }

      return {
        success: data.success,
        message: data.message,
        expiresAt: data.expiresAt ?? undefined,
      };
    } catch (error: any) {
      console.error('Failed to request registration OTP:', error);
      const errorMessage = error?.message || error?.graphQLErrors?.[0]?.message || 'Failed to request OTP';
      throw new Error(errorMessage);
    }
  }

  /**
   * Verify registration OTP and create account
   */
  async verifyRegistrationOTP(
    phoneNumber: string,
    otp: string,
    registrationData: RegistrationData
  ): Promise<{ success: boolean; userId?: string; message: string }> {
    try {
      const client = this.apolloService.getClient();
      const result = await client.mutate<VerifyRegistrationOtpMutation, VerifyRegistrationOtpMutationVariables>({
        mutation: VERIFY_REGISTRATION_OTP,
        variables: {
          phoneNumber,
          otp,
          registrationData: {
            companyName: registrationData.company.companyName,
            companyCode: registrationData.company.companyCode,
            currency: registrationData.company.currency,
            adminFirstName: registrationData.admin.firstName,
            adminLastName: registrationData.admin.lastName,
            adminPhoneNumber: registrationData.admin.phoneNumber,
            adminEmail: registrationData.admin.email,
            storeName: registrationData.store.storeName,
            storeAddress: registrationData.store.storeAddress,
          },
        },
        context: { skipChannelToken: true },
      });

      const data = result.data?.verifyRegistrationOTP;
      if (!data) {
        throw new Error('Registration failed - no response from server');
      }

      // Success
      return {
        success: data.success,
        userId: data.userId ?? undefined,
        message: data.message,
      };
    } catch (error: any) {
      console.error('Verify registration OTP error:', error);
      const errorMessage = error?.message || error?.graphQLErrors?.[0]?.message || 'Registration failed';
      throw new Error(errorMessage);
    }
  }

  /**
   * Check authorization status
   */
  async checkAuthorizationStatus(identifier: string): Promise<{ status: 'PENDING' | 'APPROVED' | 'REJECTED'; message: string }> {
    try {
      // TODO: Replace with actual GraphQL query when backend is ready
      // const client = this.apolloService.getClient();
      // const result = await client.query({
      //   query: CHECK_AUTHORIZATION_STATUS,
      //   variables: { identifier },
      //   context: { skipChannelToken: true },
      // });
      // return result.data?.checkAuthorizationStatus;

      // Mock response - assume approved for now (backend will handle actual check)
      return {
        status: 'APPROVED' as const,
        message: 'Account is approved',
      };
    } catch (error) {
      console.error('Check authorization status error:', error);
      // Default to pending if check fails
      return {
        status: 'PENDING' as const,
        message: 'Unable to verify authorization status',
      };
    }
  }

  /**
   * Legacy login with username and password (kept for backward compatibility)
   * @deprecated Use loginWithOTP instead
   */
  async login(credentials: LoginMutationVariables): Promise<LoginMutation['login']> {
    this.isLoadingSignal.set(true);
    try {
      const client = this.apolloService.getClient();
      const result = await client.mutate<LoginMutation, LoginMutationVariables>({
        mutation: LOGIN,
        variables: credentials,
        context: { skipChannelToken: true },
      });
      const { data } = result;

      const loginResult = data?.login;

      // Successful login
      if (loginResult?.__typename === 'CurrentUser') {
        // Set companies/channels from login response
        if (loginResult.channels && loginResult.channels.length > 0) {
          this.companyService.setCompaniesFromChannels(loginResult.channels);
        }

        // Fetch full administrator details
        await this.fetchActiveAdministrator();
      }

      return loginResult!;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    this.isLoadingSignal.set(true);

    try {
      const client = this.apolloService.getClient();
      await client.mutate<LogoutMutation>({
        mutation: LOGOUT,
        context: { skipChannelToken: true },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearSession();
      this.router.navigate(['/login']);
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Note: Admin registration is not supported.
   * Administrators must be created by a super admin through the admin UI.
   */

  /**
   * Clear local session data
   */
  private clearSession(): void {
    this.userSignal.set(null);
    this.companyService.clearActiveCompany();
    this.apolloService.clearAuthToken();
    this.apolloService.clearCache();
  }

  /**
   * Handle session expiration
   * Called by Apollo service when authentication error is detected
   */
  private handleSessionExpired(): void {
    console.warn('Session expired - clearing user state');
    this.userSignal.set(null);
    // Note: Apollo service handles redirect and cache clearing
  }

  /**
   * Check if user has a specific role (extend as needed)
   */
  hasRole(role: string): boolean {
    // Implement role checking logic based on your user model
    return false;
  }
}

