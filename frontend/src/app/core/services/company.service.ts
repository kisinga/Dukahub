import { Injectable, computed, inject, signal } from '@angular/core';
import type { GetActiveChannelQuery, GetUserChannelsQuery } from '../graphql/generated/graphql';
import { GET_ACTIVE_CHANNEL, GET_USER_CHANNELS } from '../graphql/operations.graphql';
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

    private readonly SESSION_KEY = 'company_session';

    private readonly companiesSignal = signal<Company[]>([]);
    private readonly activeCompanyIdSignal = signal<string | null>(null);
    private readonly isLoadingSignal = signal(false);
    private readonly activeChannelDataSignal = signal<GetActiveChannelQuery['activeChannel'] | null>(null);

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
     * ML Model asset IDs for the active channel
     * All ML model custom fields consolidated here
     */
    readonly mlModelAssetIds = computed(() => {
        const channelData = this.activeChannelDataSignal();
        const customFields = channelData?.customFields;

        if (!customFields?.mlModelJsonId || !customFields?.mlModelBinId || !customFields?.mlMetadataId) {
            return null;
        }

        return {
            mlModelJsonId: customFields.mlModelJsonId,
            mlModelBinId: customFields.mlModelBinId,
            mlMetadataId: customFields.mlMetadataId,
        };
    });

    /**
     * Company logo asset ID for the active channel
     * Used to display company branding in navbar
     */
    readonly companyLogoId = computed(() => {
        const channelData = this.activeChannelDataSignal();
        return channelData?.customFields?.companyLogoId ?? null;
    });

    /**
     * Company display name (truncated to max 10 characters)
     * Used in navbar to show active shop name
     */
    readonly companyDisplayName = computed(() => {
        const company = this.activeCompany();
        if (!company) return '';
        const name = company.code;
        return name.length > 10 ? name.substring(0, 10) + '...' : name;
    });

    /**
     * Fetch active channel data with custom fields
     * Called when channel is activated or on app initialization
     * Persists complete session to localStorage
     */
    async fetchActiveChannel(): Promise<void> {
        try {
            const client = this.apolloService.getClient();
            const result = await client.query<GetActiveChannelQuery>({
                query: GET_ACTIVE_CHANNEL,
                fetchPolicy: 'network-only',
            });

            console.log('📦 Active channel data:', result.data);

            if (result.data?.activeChannel) {
                this.activeChannelDataSignal.set(result.data.activeChannel);
                this.persistSession();

                console.log('✅ Channel data cached:', {
                    mlModelConfigured: !!result.data.activeChannel.customFields?.mlModelJsonId,
                    companyLogoConfigured: !!result.data.activeChannel.customFields?.companyLogoId,
                });
            }
        } catch (error: any) {
            console.error('❌ Failed to fetch active channel:', error);
            this.activeChannelDataSignal.set(null);
        }
    }

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
        this.apolloService.setChannelToken(company.token);

        // Set as active company
        this.activeCompanyIdSignal.set(companyId);

        // Persist and fetch channel custom fields
        this.persistSession();
        this.fetchActiveChannel();
    }

    /**
     * @deprecated Use activateCompany() instead
     * Kept for backward compatibility
     */
    selectCompany(companyId: string): void {
        this.activateCompany(companyId);
    }

    /**
     * Persist entire session to localStorage (KISS - one object, one key)
     */
    private persistSession(): void {
        const session = {
            companies: this.companiesSignal(),
            activeCompanyId: this.activeCompanyIdSignal(),
            channelData: this.activeChannelDataSignal(),
        };
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
        console.log('💾 Session persisted');
    }

    /**
     * Initialize company from localStorage on app startup
     * Restores complete session instantly, then refreshes in background
     */
    initializeFromStorage(): void {
        console.log('🔄 Initializing from storage...');

        const stored = localStorage.getItem(this.SESSION_KEY);
        if (!stored) {
            console.log('No session in storage');
            return;
        }

        try {
            const session = JSON.parse(stored);

            // Restore everything instantly
            this.companiesSignal.set(session.companies || []);
            this.activeCompanyIdSignal.set(session.activeCompanyId);
            this.activeChannelDataSignal.set(session.channelData);

            console.log('✅ Session restored:', {
                companies: session.companies?.length,
                activeCompany: session.activeCompanyId,
                cashierEnabled: session.channelData?.customFields?.cashierFlowEnabled,
            });

            // Set channel token
            const company = session.companies?.find((c: Company) => c.id === session.activeCompanyId);
            if (company) {
                this.apolloService.setChannelToken(company.token);
                // Refresh in background
                this.fetchActiveChannel();
            }
        } catch (error) {
            console.error('Failed to restore session:', error);
            localStorage.removeItem(this.SESSION_KEY);
        }
    }

    /**
     * Clear active company and all companies (useful for logout)
     */
    clearActiveCompany(): void {
        this.activeCompanyIdSignal.set(null);
        this.activeChannelDataSignal.set(null);
        this.companiesSignal.set([]);
        localStorage.removeItem(this.SESSION_KEY);
        this.apolloService.setChannelToken('');
    }
}

