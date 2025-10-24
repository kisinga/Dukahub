import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ReplaySubject, firstValueFrom } from 'rxjs';
import { Permission } from '../graphql/generated/graphql';
import {
  GET_ACTIVE_ADMIN,
  LOGIN,
  LOGOUT,
} from '../graphql/operations.graphql';
import type {
  ActiveAdministrator,
  GetActiveAdministratorQuery,
  LoginMutation,
  LoginMutationVariables,
  LogoutMutation
} from '../models/user.model';
import { ApolloService } from './apollo.service';
import { CompanyService } from './company.service';

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
      const result = await client.query<GetActiveAdministratorQuery>({
        query: GET_ACTIVE_ADMIN,
        fetchPolicy: 'network-only',
        context: { skipChannelToken: true },
      });
      const { data } = result;

      if (data?.activeAdministrator) {
        // Use the generated type directly - it's the source of truth
        this.userSignal.set(data.activeAdministrator);
        console.log('✅ Active admin fetched, now restoring session and fetching channels...');

        // CRITICAL: Restore session BEFORE fetching channels
        // This prevents fetchUserChannels from resetting to first company
        this.companyService.initializeFromStorage();

        // Fetch user channels to restore channel state (on refresh/initialization)
        // This ensures channels are available even on hard refresh
        await this.companyService.fetchUserChannels();
      } else {
        // No administrator data means not authenticated
        this.userSignal.set(null);
      }
    } catch (error) {
      console.error('Failed to fetch active administrator:', error);

      // Check if this is an authentication error
      if (this.isAuthError(error)) {
        console.warn('Authentication error detected, clearing session');
        this.userSignal.set(null);
        // Note: Apollo error link will handle redirect
      }
      // For other errors (network issues, etc.), don't clear session during initialization
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
   * Login with username and password
   * Returns the login mutation result directly from the generated types
   */
  async login(credentials: LoginMutationVariables): Promise<LoginMutation['login']> {
    this.isLoadingSignal.set(true);
    // console.log('login', credentials);
    try {
      const client = this.apolloService.getClient();
      const result = await client.mutate<LoginMutation, LoginMutationVariables>({
        mutation: LOGIN,
        variables: credentials,
        context: { skipChannelToken: true },
      });
      const { data } = result;
      // console.log('data', data);

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

