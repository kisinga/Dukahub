import { Injectable, computed, inject, signal } from '@angular/core';
import type { Company } from '../models/company.model';
import { ApolloService } from './apollo.service';

/**
 * Service for managing company (channel) selection
 * In Vendure, channels represent different companies/stores
 * 
 * Key concept: activeCompanyId is the single source of truth that all dashboard 
 * components depend on for fetching company-specific data
 */
@Injectable({
    providedIn: 'root',
})
export class CompanyService {
    private readonly apolloService = inject(ApolloService);

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
        console.log('📦 Set companies from login:', companies);

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

