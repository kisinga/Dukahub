import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { DeleteConfirmationData, DeleteConfirmationModalComponent } from './components/delete-confirmation-modal.component';
import { PaginationComponent } from './components/pagination.component';
import { ProductAction, ProductCardComponent } from './components/product-card.component';
import { ProductSearchBarComponent } from './components/product-search-bar.component';
import { ProductStats, ProductStatsComponent } from './components/product-stats.component';
import { ProductTableRowComponent } from './components/product-table-row.component';

/**
 * Products list page - refactored with composable components
 * 
 * ARCHITECTURE:
 * - Uses composable components for better maintainability
 * - Separates mobile (cards) and desktop (table) views
 * - Centralized action handling
 * - KISS principles applied
 */
@Component({
  selector: 'app-products',
  imports: [
    CommonModule,
    RouterLink,
    ProductCardComponent,
    ProductStatsComponent,
    ProductSearchBarComponent,
    ProductTableRowComponent,
    PaginationComponent,
    DeleteConfirmationModalComponent
  ],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);

  // View references
  readonly deleteModal = viewChild<DeleteConfirmationModalComponent>('deleteModal');

  // State from service
  readonly products = this.productService.products;
  readonly isLoading = this.productService.isLoading;
  readonly error = this.productService.error;
  readonly totalItems = this.productService.totalItems;

  // Local UI state
  readonly searchQuery = signal('');
  readonly currentPage = signal(1);
  readonly itemsPerPage = signal(10);
  readonly pageOptions = [10, 25, 50, 100];
  readonly deleteModalData = signal<DeleteConfirmationData>({ productName: '', variantCount: 0 });
  readonly productToDelete = signal<string | null>(null);

  // Computed: filtered products
  readonly filteredProducts = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const allProducts = this.products();

    if (!query) return allProducts;

    return allProducts.filter(product =>
      product.name.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query) ||
      product.variants?.some((v: any) => v.sku.toLowerCase().includes(query))
    );
  });

  // Computed: paginated products
  readonly paginatedProducts = computed(() => {
    const filtered = this.filteredProducts();
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = (page - 1) * perPage;
    const end = start + perPage;

    return filtered.slice(start, end);
  });

  // Computed: total pages
  readonly totalPages = computed(() => {
    const filtered = this.filteredProducts();
    const perPage = this.itemsPerPage();
    return Math.ceil(filtered.length / perPage) || 1;
  });

  // Computed: statistics
  readonly stats = computed((): ProductStats => {
    const prods = this.products();
    const totalProducts = prods.length;
    const totalVariants = prods.reduce((sum, p) => sum + (p.variants?.length || 0), 0);
    const totalStock = prods.reduce((sum, p) =>
      sum + (p.variants?.reduce((vSum: number, v: any) => vSum + (v.stockOnHand || 0), 0) || 0), 0
    );
    const lowStock = prods.filter(p =>
      p.variants?.some((v: any) => v.stockOnHand < 10)
    ).length;

    return { totalProducts, totalVariants, totalStock, lowStock };
  });

  // Computed: end item for pagination display
  readonly endItem = computed(() => {
    return Math.min(this.currentPage() * this.itemsPerPage(), this.filteredProducts().length);
  });

  ngOnInit(): void {
    this.loadProducts();
  }

  async loadProducts(): Promise<void> {
    await this.productService.fetchProducts({
      take: 100,
      skip: 0
    });
  }

  async refreshProducts(): Promise<void> {
    await this.loadProducts();
  }

  /**
   * Handle product actions (view, edit, purchase, delete)
   */
  onProductAction(event: { action: ProductAction; productId: string }): void {
    const { action, productId } = event;

    switch (action) {
      case 'view':
        // Navigate to product detail view (to be implemented)
        console.log('View product:', productId);
        break;

      case 'edit':
        this.router.navigate(['/dashboard/products/edit', productId]);
        break;

      case 'purchase':
        // Navigate to purchase flow with supplier (to be implemented)
        console.log('Purchase product:', productId);
        // TODO: Navigate to supplier purchase flow
        // this.router.navigate(['/dashboard/purchases/create'], { queryParams: { productId } });
        break;

      case 'delete':
        this.confirmDeleteProduct(productId);
        break;
    }
  }

  /**
   * Show delete confirmation modal
   */
  confirmDeleteProduct(productId: string): void {
    const product = this.products().find(p => p.id === productId);
    if (!product) return;

    this.productToDelete.set(productId);
    this.deleteModalData.set({
      productName: product.name,
      variantCount: product.variants?.length || 0
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
    const productId = this.productToDelete();
    if (!productId) return;

    // Hide modal
    const modal = this.deleteModal();
    if (modal) {
      modal.hide();
    }

    // Delete the product
    const success = await this.productService.deleteProduct(productId);

    if (success) {
      // Clear state
      this.productToDelete.set(null);

      // Refresh the product list
      await this.refreshProducts();
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
    this.productToDelete.set(null);
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
    this.productService.clearError();
  }

  /**
   * Track by function for ngFor performance
   */
  trackByProductId(index: number, product: any): string {
    return product.id;
  }

  /**
   * Math utilities for template
   */
  readonly Math = Math;
}

