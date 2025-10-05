import { Injectable } from '@angular/core';
import { ApolloClient, HttpLink, InMemoryCache, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { environment } from '../../../environments/environment';

/**
 * Service for managing Apollo GraphQL client
 * Handles authentication tokens, headers, and request configuration
 */
@Injectable({
    providedIn: 'root',
})
export class ApolloService {
    private readonly AUTH_TOKEN_KEY = 'auth_token';
    private readonly CHANNEL_TOKEN_KEY = 'channel_token';
    private readonly LANGUAGE_CODE_KEY = 'language_code';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private apolloClient: any;

    constructor() {
        this.apolloClient = this.createApolloClient();
    }

    /**
     * Get the Apollo client instance
     */
    getClient() {
        return this.apolloClient;
    }

    /**
     * Store authentication token
     */
    setAuthToken(token: string): void {
        localStorage.setItem(this.AUTH_TOKEN_KEY, token);
    }

    /**
     * Get stored authentication token
     */
    getAuthToken(): string | null {
        return localStorage.getItem(this.AUTH_TOKEN_KEY);
    }

    /**
     * Remove authentication token
     */
    clearAuthToken(): void {
        localStorage.removeItem(this.AUTH_TOKEN_KEY);
    }

    /**
     * Set channel token for multi-channel projects
     */
    setChannelToken(token: string): void {
        localStorage.setItem(this.CHANNEL_TOKEN_KEY, token);
    }

    /**
     * Get channel token
     */
    getChannelToken(): string | null {
        return localStorage.getItem(this.CHANNEL_TOKEN_KEY);
    }

    /**
     * Set language code for localized results
     */
    setLanguageCode(code: string): void {
        localStorage.setItem(this.LANGUAGE_CODE_KEY, code);
    }

    /**
     * Get language code
     */
    getLanguageCode(): string | null {
        return localStorage.getItem(this.LANGUAGE_CODE_KEY);
    }

    /**
     * Create and configure Apollo client
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private createApolloClient(): any {
        const httpLink = new HttpLink({
            uri: () => {
                const languageCode = this.getLanguageCode();
                if (languageCode) {
                    return `${environment.apiUrl}?languageCode=${languageCode}`;
                }
                return environment.apiUrl;
            },
            // Required for cookie-based session management
            credentials: 'include',
            // Include cookies in CORS requests
            fetchOptions: {
                mode: 'cors',
            },
        });

        // Middleware to attach auth token and headers to requests
        const authLink = setContext(() => {
            const authToken = this.getAuthToken();
            const channelToken = this.getChannelToken();
            const headers: Record<string, string> = {};

            if (authToken) {
                headers['authorization'] = `Bearer ${authToken}`;
            }
            if (channelToken) {
                headers['vendure-token'] = channelToken;
            }

            return { headers };
        });

        return new ApolloClient({
            link: from([authLink, httpLink]),
            cache: new InMemoryCache(),
            defaultOptions: {
                watchQuery: {
                    fetchPolicy: 'cache-and-network',
                    errorPolicy: 'all',
                },
                query: {
                    fetchPolicy: 'network-only',
                    errorPolicy: 'all',
                },
                mutate: {
                    errorPolicy: 'all',
                },
            },
        });
    }

    /**
     * Clear Apollo cache
     */
    clearCache(): Promise<void> {
        return this.apolloClient.clearStore();
    }

    /**
     * Reset Apollo store (clears cache and refetches active queries)
     */
    resetStore(): Promise<void> {
        return this.apolloClient.resetStore();
    }
}

