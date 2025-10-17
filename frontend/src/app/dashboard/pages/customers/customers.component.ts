import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CustomerService } from '../../../core/services/customer.service';
import { CustomerAction, CustomerCardComponent } from './components/customer-card.component';
import { CustomerSearchBarComponent } from './components/customer-search-bar.component';
import { CustomerStats, CustomerStatsComponent } from './components/customer-stats.component';
import { CustomerTableRowComponent } from './components/customer-table-row.component';
import { DeleteConfirmationData, DeleteConfirmationModalComponent } from './components/delete-confirmation-modal.component';
import { PaginationComponent } from './components/pagination.component';

/**
 * Customers list page - similar to products page
 * 
 * ARCHITECTURE:
 * - Uses composable components for better maintainability
 * - Separates mobile (cards) and desktop (table) views
 * - Centralized action handling
 * - KISS principles applied
 */
@Component({
    selector: 'app-customers',
    imports: [
        CommonModule,
        CustomerCardComponent,
        CustomerStatsComponent,
        CustomerSearchBarComponent,
        CustomerTableRowComponent,
        PaginationComponent,
        DeleteConfirmationModalComponent
    ],
    templateUrl: './customers.component.html',
    styleUrl: './customers.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomersComponent implements OnInit {
    private readonly customerService = inject(CustomerService);
    readonly router = inject(Router);

    // View references
    readonly deleteModal = viewChild<DeleteConfirmationModalComponent>('deleteModal');

    // State from service
    readonly customers = this.customerService.customers;
    readonly isLoading = this.customerService.isLoading;
    readonly error = this.customerService.error;
    readonly totalItems = this.customerService.totalItems;

    // Local UI state
    readonly searchQuery = signal('');
    readonly currentPage = signal(1);
    readonly itemsPerPage = signal(10);
    readonly pageOptions = [10, 25, 50, 100];
    readonly deleteModalData = signal<DeleteConfirmationData>({ customerName: '', addressCount: 0 });
    readonly customerToDelete = signal<string | null>(null);

    // Computed: filtered customers
    readonly filteredCustomers = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        const allCustomers = this.customers();

        if (!query) return allCustomers;

        return allCustomers.filter(customer =>
            customer.firstName?.toLowerCase().includes(query) ||
            customer.lastName?.toLowerCase().includes(query) ||
            customer.emailAddress?.toLowerCase().includes(query) ||
            customer.phoneNumber?.toLowerCase().includes(query)
        );
    });

    // Computed: paginated customers
    readonly paginatedCustomers = computed(() => {
        const filtered = this.filteredCustomers();
        const page = this.currentPage();
        const perPage = this.itemsPerPage();
        const start = (page - 1) * perPage;
        const end = start + perPage;

        return filtered.slice(start, end);
    });

    // Computed: total pages
    readonly totalPages = computed(() => {
        const filtered = this.filteredCustomers();
        const perPage = this.itemsPerPage();
        return Math.ceil(filtered.length / perPage) || 1;
    });

    // Computed: statistics
    readonly stats = computed((): CustomerStats => {
        const customers = this.customers();
        const totalCustomers = customers.length;
        const verifiedCustomers = customers.filter(c => c.user?.verified).length;
        const customersWithAddresses = customers.filter(c => c.addresses?.length > 0).length;
        const recentCustomers = customers.filter(c => {
            const createdAt = new Date(c.createdAt);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return createdAt >= thirtyDaysAgo;
        }).length;

        return { totalCustomers, verifiedCustomers, customersWithAddresses, recentCustomers };
    });

    // Computed: end item for pagination display
    readonly endItem = computed(() => {
        return Math.min(this.currentPage() * this.itemsPerPage(), this.filteredCustomers().length);
    });

    ngOnInit(): void {
        this.loadCustomers();
    }

    async loadCustomers(): Promise<void> {
        await this.customerService.fetchCustomers({
            take: 100,
            skip: 0
        });
    }

    async refreshCustomers(): Promise<void> {
        await this.loadCustomers();
    }

    /**
     * Handle customer actions (view, edit, delete)
     */
    onCustomerAction(event: { action: CustomerAction; customerId: string }): void {
        const { action, customerId } = event;

        switch (action) {
            case 'view':
                // Navigate to customer detail view (to be implemented)
                console.log('View customer:', customerId);
                break;

            case 'edit':
                this.router.navigate(['/dashboard/customers/edit', customerId]);
                break;

            case 'delete':
                this.confirmDeleteCustomer(customerId);
                break;
        }
    }

    /**
     * Show delete confirmation modal
     */
    confirmDeleteCustomer(customerId: string): void {
        const customer = this.customers().find(c => c.id === customerId);
        if (!customer) return;

        this.customerToDelete.set(customerId);
        this.deleteModalData.set({
            customerName: `${customer.firstName} ${customer.lastName}`,
            addressCount: customer.addresses?.length || 0
        });

        // Show modal
        const modal = this.deleteModal();
        if (modal) {
            modal.show();
        }
    }

    /**
     * Handle delete confirmation
     */
    async onDeleteConfirmed(): Promise<void> {
        const customerId = this.customerToDelete();
        if (!customerId) return;

        // Hide modal
        const modal = this.deleteModal();
        if (modal) {
            modal.hide();
        }

        // Delete the customer
        const success = await this.customerService.deleteCustomer(customerId);

        if (success) {
            // Clear state
            this.customerToDelete.set(null);

            // Refresh the customer list
            await this.refreshCustomers();
        }
    }

    /**
     * Handle delete cancellation
     */
    onDeleteCancelled(): void {
        const modal = this.deleteModal();
        if (modal) {
            modal.hide();
        }
        this.customerToDelete.set(null);
    }

    /**
     * Go to specific page
     */
    goToPage(page: number): void {
        if (page >= 1 && page <= this.totalPages()) {
            this.currentPage.set(page);
        }
    }

    /**
     * Change items per page
     */
    changeItemsPerPage(items: number): void {
        this.itemsPerPage.set(items);
        this.currentPage.set(1); // Reset to first page
    }

    /**
     * Clear error message
     */
    clearError(): void {
        this.customerService.clearError();
    }

    /**
     * Track by function for ngFor performance
     */
    trackByCustomerId(index: number, customer: any): string {
        return customer.id;
    }

    /**
     * Math utilities for template
     */
    readonly Math = Math;
}
