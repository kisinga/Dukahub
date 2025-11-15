import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PurchaseService } from '../../../core/services/purchase.service';
import { PaginationComponent } from '../products/components/pagination.component';
import { PurchaseCardComponent } from './components/purchase-card.component';
import { PurchaseSearchBarComponent } from './components/purchase-search-bar.component';
import { PurchaseStats, PurchaseStatsComponent } from './components/purchase-stats.component';
import { PurchaseAction, PurchaseTableRowComponent } from './components/purchase-table-row.component';

/**
 * Purchases list page
 * 
 * ARCHITECTURE:
 * - Uses composable components for better maintainability
 * - Separates mobile (cards) and desktop (table) views
 * - Centralized action handling
 * - KISS principles applied
 */
@Component({
    selector: 'app-purchases',
    imports: [
        CommonModule,
        PurchaseStatsComponent,
        PurchaseSearchBarComponent,
        PurchaseCardComponent,
        PurchaseTableRowComponent,
        PaginationComponent
    ],
    templateUrl: './purchases.component.html',
    styleUrl: './purchases.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchasesComponent implements OnInit {
    private readonly purchaseService = inject(PurchaseService);
    readonly router = inject(Router);

    // State from service
    readonly purchases = this.purchaseService.purchases;
    readonly isLoading = this.purchaseService.isLoadingList;
    readonly error = this.purchaseService.errorList;
    readonly totalItems = this.purchaseService.totalItems;

    // Local UI state
    readonly searchQuery = signal('');
    readonly currentPage = signal(1);
    readonly itemsPerPage = signal(10);
    readonly pageOptions = [10, 25, 50, 100];

    // Computed: filtered purchases
    readonly filteredPurchases = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        const allPurchases = this.purchases();

        if (!query) return allPurchases;

        return allPurchases.filter(purchase => {
            const supplier = purchase.supplier;
            const supplierName = supplier
                ? `${supplier.firstName} ${supplier.lastName}`.trim() || supplier.emailAddress || ''
                : '';
            const reference = purchase.referenceNumber || '';
            return (
                supplierName.toLowerCase().includes(query) ||
                reference.toLowerCase().includes(query)
            );
        });
    });

    // Computed: paginated purchases
    readonly paginatedPurchases = computed(() => {
        const filtered = this.filteredPurchases();
        const page = this.currentPage();
        const perPage = this.itemsPerPage();
        const start = (page - 1) * perPage;
        const end = start + perPage;

        return filtered.slice(start, end);
    });

    // Computed: total pages
    readonly totalPages = computed(() => {
        const filtered = this.filteredPurchases();
        const perPage = this.itemsPerPage();
        return Math.ceil(filtered.length / perPage) || 1;
    });

    // Computed: statistics
    readonly stats = computed((): PurchaseStats => {
        const allPurchases = this.purchases();
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const totalPurchases = allPurchases.length;
        const totalValue = allPurchases.reduce((sum, p) => sum + (p.totalCost || 0), 0);
        const thisMonth = allPurchases.filter(p => {
            const purchaseDate = new Date(p.purchaseDate);
            return purchaseDate >= startOfMonth;
        }).length;
        const pendingPayments = allPurchases.filter(
            p => p.paymentStatus?.toLowerCase() === 'pending' || p.paymentStatus?.toLowerCase() === 'partial'
        ).length;

        return { totalPurchases, totalValue, thisMonth, pendingPayments };
    });

    // Computed: end item for pagination display
    readonly endItem = computed(() => {
        return Math.min(this.currentPage() * this.itemsPerPage(), this.filteredPurchases().length);
    });

    ngOnInit(): void {
        this.loadPurchases();
    }

    async loadPurchases(): Promise<void> {
        await this.purchaseService.fetchPurchases({
            take: 100,
            skip: 0
        });
    }

    async refreshPurchases(): Promise<void> {
        await this.loadPurchases();
    }

    /**
     * Handle purchase actions (view, edit, delete)
     */
    onPurchaseAction(event: { action: PurchaseAction; purchaseId: string }): void {
        const { action, purchaseId } = event;

        switch (action) {
            case 'view':
                // Navigate to purchase detail view (to be implemented)
                console.log('View purchase:', purchaseId);
                break;

            case 'edit':
                // Navigate to edit purchase (to be implemented)
                console.log('Edit purchase:', purchaseId);
                break;

            case 'delete':
                // Delete purchase (to be implemented)
                console.log('Delete purchase:', purchaseId);
                break;
        }
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
        this.purchaseService.clearListError();
    }

    /**
     * Track by function for ngFor performance
     */
    trackByPurchaseId(index: number, purchase: any): string {
        return purchase.id;
    }

    /**
     * Math utilities for template
     */
    readonly Math = Math;
}
