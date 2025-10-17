import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { SupplierService } from '../../../core/services/supplier.service';
import { DeleteConfirmationData, DeleteConfirmationModalComponent } from './components/delete-confirmation-modal.component';
import { PaginationComponent } from './components/pagination.component';
import { SupplierAction, SupplierCardComponent } from './components/supplier-card.component';
import { SupplierSearchBarComponent } from './components/supplier-search-bar.component';
import { SupplierStats, SupplierStatsComponent } from './components/supplier-stats.component';
import { SupplierTableRowComponent } from './components/supplier-table-row.component';

/**
 * Suppliers list page - similar to products and customers pages
 * 
 * ARCHITECTURE:
 * - Uses composable components for better maintainability
 * - Separates mobile (cards) and desktop (table) views
 * - Centralized action handling
 * - KISS principles applied
 */
@Component({
    selector: 'app-suppliers',
    imports: [
        CommonModule,
        SupplierCardComponent,
        SupplierStatsComponent,
        SupplierSearchBarComponent,
        SupplierTableRowComponent,
        PaginationComponent,
        DeleteConfirmationModalComponent
    ],
    templateUrl: './suppliers.component.html',
    styleUrl: './suppliers.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuppliersComponent implements OnInit {
    private readonly supplierService = inject(SupplierService);
    readonly router = inject(Router);

    // View references
    readonly deleteModal = viewChild<DeleteConfirmationModalComponent>('deleteModal');

    // State from service
    readonly suppliers = this.supplierService.suppliers;
    readonly isLoading = this.supplierService.isLoading;
    readonly error = this.supplierService.error;
    readonly totalItems = this.supplierService.totalItems;

    // Local UI state
    readonly searchQuery = signal('');
    readonly currentPage = signal(1);
    readonly itemsPerPage = signal(10);
    readonly pageOptions = [10, 25, 50, 100];
    readonly deleteModalData = signal<DeleteConfirmationData>({ supplierName: '', addressCount: 0 });
    readonly supplierToDelete = signal<string | null>(null);

    // Computed: filtered suppliers
    readonly filteredSuppliers = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        const allSuppliers = this.suppliers();

        if (!query) return allSuppliers;

        return allSuppliers.filter(supplier =>
            supplier.firstName?.toLowerCase().includes(query) ||
            supplier.lastName?.toLowerCase().includes(query) ||
            supplier.emailAddress?.toLowerCase().includes(query) ||
            supplier.phoneNumber?.toLowerCase().includes(query) ||
            supplier.customFields?.supplierType?.toLowerCase().includes(query) ||
            supplier.customFields?.contactPerson?.toLowerCase().includes(query)
        );
    });

    // Computed: paginated suppliers
    readonly paginatedSuppliers = computed(() => {
        const filtered = this.filteredSuppliers();
        const page = this.currentPage();
        const perPage = this.itemsPerPage();
        const start = (page - 1) * perPage;
        const end = start + perPage;

        return filtered.slice(start, end);
    });

    // Computed: total pages
    readonly totalPages = computed(() => {
        const filtered = this.filteredSuppliers();
        const perPage = this.itemsPerPage();
        return Math.ceil(filtered.length / perPage) || 1;
    });

    // Computed: statistics
    readonly stats = computed((): SupplierStats => {
        const suppliers = this.suppliers();
        const totalSuppliers = suppliers.length;
        const verifiedSuppliers = suppliers.filter(s => s.user?.verified).length;
        const suppliersWithAddresses = suppliers.filter(s => s.addresses?.length > 0).length;
        const recentSuppliers = suppliers.filter(s => {
            const createdAt = new Date(s.createdAt);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return createdAt >= thirtyDaysAgo;
        }).length;

        return { totalSuppliers, verifiedSuppliers, suppliersWithAddresses, recentSuppliers };
    });

    // Computed: end item for pagination display
    readonly endItem = computed(() => {
        return Math.min(this.currentPage() * this.itemsPerPage(), this.filteredSuppliers().length);
    });

    ngOnInit(): void {
        this.loadSuppliers();
    }

    async loadSuppliers(): Promise<void> {
        await this.supplierService.fetchSuppliers({
            take: 100,
            skip: 0
        });
    }

    async refreshSuppliers(): Promise<void> {
        await this.loadSuppliers();
    }

    /**
     * Handle supplier actions (view, edit, delete)
     */
    onSupplierAction(event: { action: SupplierAction; supplierId: string }): void {
        const { action, supplierId } = event;

        switch (action) {
            case 'view':
                // Navigate to supplier detail view (to be implemented)
                console.log('View supplier:', supplierId);
                break;

            case 'edit':
                this.router.navigate(['/dashboard/suppliers/edit', supplierId]);
                break;

            case 'delete':
                this.confirmDeleteSupplier(supplierId);
                break;
        }
    }

    /**
     * Show delete confirmation modal
     */
    confirmDeleteSupplier(supplierId: string): void {
        const supplier = this.suppliers().find(s => s.id === supplierId);
        if (!supplier) return;

        this.supplierToDelete.set(supplierId);
        this.deleteModalData.set({
            supplierName: `${supplier.firstName} ${supplier.lastName}`,
            addressCount: supplier.addresses?.length || 0
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
        const supplierId = this.supplierToDelete();
        if (!supplierId) return;

        // Hide modal
        const modal = this.deleteModal();
        if (modal) {
            modal.hide();
        }

        // Delete the supplier
        const success = await this.supplierService.deleteSupplier(supplierId);

        if (success) {
            // Clear state
            this.supplierToDelete.set(null);

            // Refresh the supplier list
            await this.refreshSuppliers();
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
        this.supplierToDelete.set(null);
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
        this.supplierService.clearError();
    }

    /**
     * Track by function for ngFor performance
     */
    trackBySupplierId(index: number, supplier: any): string {
        return supplier.id;
    }

    /**
     * Math utilities for template
     */
    readonly Math = Math;
}
