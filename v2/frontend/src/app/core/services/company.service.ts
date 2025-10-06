import { Injectable, computed, inject, signal } from '@angular/core';
import { GET_USER_CHANNELS } from '../graphql/auth.graphql';
import type { GetUserChannelsQuery } from '../graphql/generated/graphql';
import type { Company } from '../models/company.model';
import { ApolloService } from './apollo.service';

/**
 * Service for managing company (channel) selection
 * 
 * ARCHITECTURE:
 * - Channel = Independent customer company (e.g., "Downtown Groceries Inc.")
 * - Stock Location = Individual shop within company (separate service, not implemented yet)
 * 
 * UX FLOW:
 * - Login auto-selects first company (via activateCompany)
 * - User then selects shop in separate shop selector (primary navbar action)
 * - Company selector is in extended menu (rare use, only for multi-company users)
 * 
 * Key concept: activeCompanyId is the single source of truth that all dashboard 
 * components depend on for fetching company-specific data
 */
@Injectable({
    providedIn: 'root',
})
export class CompanyService {
    private readonly apolloService = inject(ApolloService);

    private readonly COMPANIES_STORAGE_KEY = 'user_companies';

    private readonly companiesSignal = signal<Company[]>([]);
    private readonly activeCompanyIdSignal = signal<string | null>(null);
    private readonly isLoadingSignal = signal(false);

    // Public readonly signals
    readonly companies = this.companiesSignal.asReadonly();
    readonly activeCompanyId = this.activeCompanyIdSignal.asReadonly();
    readonly isLoading = this.isLoadingSignal.asReadonly();

    // Computed: Current active company (the one all dashboard operations use)
    readonly activeCompany = computed(() => {
        const id = this.activeCompanyIdSignal();
        const companies = this.companiesSignal();
        return companies.find((c) => c.id === id) || null;
    });

    /**
     * Fetch all channels/companies for the authenticated user
     * Called on app initialization to restore channel state
     */
    async fetchUserChannels(): Promise<void> {
        this.isLoadingSignal.set(true);
        console.log('📦 Fetching user channels...');

        try {
            const client = this.apolloService.getClient();
            const result = await client.query<GetUserChannelsQuery>({
                query: GET_USER_CHANNELS,
                fetchPolicy: 'network-only',
                context: { skipChannelToken: true },
            });

            console.log('📦 Full result:', result);
            console.log('📦 Channel fetch data:', result.data);
            console.log('📦 Channel fetch error:', result.error);

            if (result.data?.me?.channels) {
                this.setCompaniesFromChannels(result.data.me.channels);
            }
        } catch (error) {
            console.error('❌ Failed to fetch user channels:', error);
            this.companiesSignal.set([]);
        } finally {
            this.isLoadingSignal.set(false);
        }
    }

    /**
     * Set companies from login response channels
     * This is the primary method to populate companies after login
     * Automatically activates the first company
     * 
     * @param channels - Array of channels from login response
     */
    setCompaniesFromChannels(channels: Array<{ id: string; code: string; token: string }>): void {
        const companies: Company[] = channels.map((channel) => ({
            id: channel.id,
            code: channel.code,
            token: channel.token,
        }));

        this.companiesSignal.set(companies);
        console.log('📦 Set companies from channels:', companies);

        // Auto-activate first company if:
        // 1. No company is currently active
        // 2. We have at least one company available
        if (!this.activeCompanyIdSignal() && companies.length > 0) {
            this.activateCompany(companies[0].id);
        }
    }

    /**
     * Activate a company (channel) - makes it the active company for all operations
     * This is the primary method that sets activeCompanyId
     * 
     * @param companyId - The channel ID to activate
     */
    activateCompany(companyId: string): void {
        const company = this.companiesSignal().find((c) => c.id === companyId);
        if (!company) {
            console.warn(`Cannot activate company ${companyId}: not found in companies list`);
            return;
        }

        console.log(`Activating company: ${company.code} (${companyId})`);

        // Set channel token for subsequent requests
        // In Vendure, we use the channel token to scope ALL operations to this channel
        this.apolloService.setChannelToken(companyId);

        // Set as active company
        this.activeCompanyIdSignal.set(companyId);

        // Persist to localStorage for session recovery
        localStorage.setItem('active_company_id', companyId);
    }

    /**
     * @deprecated Use activateCompany() instead
     * Kept for backward compatibility
     */
    selectCompany(companyId: string): void {
        this.activateCompany(companyId);
    }

    /**
     * Initialize company from localStorage on app startup
     * This restores the previously active company without fetching
     */
    initializeFromStorage(): void {
        const storedCompanyId = localStorage.getItem('active_company_id');
        if (storedCompanyId) {
            console.log(`Restoring active company from storage: ${storedCompanyId}`);
            this.activeCompanyIdSignal.set(storedCompanyId);
            this.apolloService.setChannelToken(storedCompanyId);
        }
    }

    /**
     * Clear active company and all companies (useful for logout)
     */
    clearActiveCompany(): void {
        this.activeCompanyIdSignal.set(null);
        this.companiesSignal.set([]);
        localStorage.removeItem('active_company_id');
        this.apolloService.setChannelToken('');
    }
}

