import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ReplaySubject, firstValueFrom } from 'rxjs';
import {
  GET_ACTIVE_ADMIN,
  LOGIN,
  LOGOUT,
} from '../graphql/auth.graphql';
import type {
  LoginCredentials,
  LoginResult,
  User
} from '../models/user.model';
import { ApolloService } from './apollo.service';

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
  private readonly router = inject(Router);

  // Authentication state signals
  private readonly userSignal = signal<User | null>(null);
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
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddress || 'User';
  });

  constructor() {
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
   */
  private async fetchActiveAdministrator(): Promise<void> {
    try {
      const client = this.apolloService.getClient();
      const { data, errors } = await client.query({
        query: GET_ACTIVE_ADMIN,
        fetchPolicy: 'network-only',
      });

      if (errors && errors.length > 0) {
        console.warn('GraphQL errors fetching admin:', errors);
        // Don't clear session on GraphQL errors - might just be network issue
        return;
      }

      if (data?.activeAdministrator) {
        this.userSignal.set({
          id: data.activeAdministrator.id,
          firstName: data.activeAdministrator.firstName,
          lastName: data.activeAdministrator.lastName,
          emailAddress: data.activeAdministrator.emailAddress,
        });
      }
      // Don't clear session if no data - user might not be logged in yet
    } catch (error) {
      console.error('Failed to fetch active administrator:', error);
      // Don't clear session on network errors during initialization
    }
  }

  /**
   * Login with username and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    this.isLoadingSignal.set(true);

    try {
      const client = this.apolloService.getClient();
      const { data, errors } = await client.mutate({
        mutation: LOGIN,
        variables: {
          username: credentials.username,
          password: credentials.password,
          rememberMe: credentials.rememberMe ?? false,
        },
      });

      if (errors && errors.length > 0) {
        return {
          success: false,
          error: errors[0].message,
        };
      }

      const loginResult = data?.login;

      // Check for error types
      if (
        loginResult?.__typename === 'InvalidCredentialsError' ||
        loginResult?.__typename === 'NativeAuthStrategyError'
      ) {
        return {
          success: false,
          error: loginResult.message,
        };
      }

      // Successful login
      if (loginResult?.__typename === 'CurrentUser') {
        // Fetch full administrator details
        await this.fetchActiveAdministrator();
        return { success: true };
      }

      return {
        success: false,
        error: 'Unknown error occurred during login',
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
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
      await client.mutate({
        mutation: LOGOUT,
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
    this.apolloService.clearAuthToken();
    this.apolloService.clearCache();
  }

  /**
   * Check if user has a specific role (extend as needed)
   */
  hasRole(role: string): boolean {
    // Implement role checking logic based on your user model
    return false;
  }
}

