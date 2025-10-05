import { Injectable, computed, inject, signal } from '@angular/core';
import { gql } from '@apollo/client';
import type { Company } from '../models/company.model';
import { ApolloService } from './apollo.service';

const GET_COMPANIES = gql`
  query GetAdministratorChannels {
    channels {
      items {
        id
        code
        token
      }
    }
  }
`;

/**
 * Service for managing company (channel) selection with HATEOAS pattern
 * In Vendure, channels represent different companies/stores
 */
@Injectable({
    providedIn: 'root',
})
export class CompanyService {
    private readonly apolloService = inject(ApolloService);

    private readonly companiesSignal = signal<Company[]>([]);
    private readonly selectedCompanyIdSignal = signal<string | null>(null);
    private readonly isLoadingSignal = signal(false);

    readonly companies = this.companiesSignal.asReadonly();
    readonly selectedCompanyId = this.selectedCompanyIdSignal.asReadonly();
    readonly isLoading = this.isLoadingSignal.asReadonly();

    // Computed: Current selected company
    readonly selectedCompany = computed(() => {
        const id = this.selectedCompanyIdSignal();
        const companies = this.companiesSignal();
        return companies.find((c) => c.id === id) || companies[0] || null;
    });

    /**
     * Fetch companies (channels) for current admin
     * Auto-select first company if none selected
     */
    async fetchCompanies(): Promise<void> {
        this.isLoadingSignal.set(true);

        try {
            const client = this.apolloService.getClient();
            const { data, errors } = await client.query({
                query: GET_COMPANIES,
                fetchPolicy: 'network-only',
            });

            console.log('Fetching companies - Response:', { data, errors });

            if (errors && errors.length > 0) {
                console.error('GraphQL errors fetching channels:', errors);
            }

            if (data?.channels?.items) {
                console.log('Channels items:', data.channels.items);
                // Map Vendure channels to companies with HATEOAS links
                const companies: Company[] = data.channels.items.map((channel: any) => ({
                    id: channel.id,
                    name: channel.code,
                    logo: 'default_avatar.png', // TODO: Add logo support
                    _links: {
                        self: {
                            href: `/admin-api/channels/${channel.id}`,
                            rel: 'self',
                        },
                        select: {
                            href: `/admin-api/channels/${channel.id}/select`,
                            rel: 'select',
                            method: 'POST',
                        },
                        dashboard: {
                            href: `/dashboard?channel=${channel.id}`,
                            rel: 'dashboard',
                        },
                    },
                }));

                this.companiesSignal.set(companies);

                // Auto-select first company if none selected
                if (!this.selectedCompanyIdSignal() && companies.length > 0) {
                    this.selectCompany(companies[0].id);
                }
            }
        } catch (error) {
            console.error('Failed to fetch companies:', error);
            this.companiesSignal.set([]);
        } finally {
            this.isLoadingSignal.set(false);
        }
    }

    /**
     * Select a company (channel) using HATEOAS link
     * Updates the channel token in Apollo service
     */
    selectCompany(companyId: string): void {
        const company = this.companiesSignal().find((c) => c.id === companyId);
        if (!company) return;

        // Follow HATEOAS select link
        const selectLink = company._links.select;
        if (selectLink) {
            // Set channel token for subsequent requests
            // In Vendure, we use the channel token to scope operations
            this.apolloService.setChannelToken(companyId);
        }

        this.selectedCompanyIdSignal.set(companyId);

        // Store in localStorage for persistence
        localStorage.setItem('selected_company_id', companyId);
    }

    /**
     * Navigate to company dashboard using HATEOAS link
     */
    navigateToCompanyDashboard(companyId: string): string | null {
        const company = this.companiesSignal().find((c) => c.id === companyId);
        return company?._links.dashboard?.href || null;
    }

    /**
     * Initialize company selection from localStorage
     */
    initializeFromStorage(): void {
        const storedCompanyId = localStorage.getItem('selected_company_id');
        if (storedCompanyId) {
            this.selectedCompanyIdSignal.set(storedCompanyId);
            this.apolloService.setChannelToken(storedCompanyId);
        }
    }
}

