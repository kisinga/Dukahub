import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-products',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsComponent implements OnInit {
  private readonly productService = inject(ProductService);

  // State
  readonly products = this.productService.products;
  readonly isLoading = this.productService.isLoading;
  readonly error = this.productService.error;
  readonly totalItems = this.productService.totalItems;

  // Local state for search and filters
  readonly searchQuery = signal('');
  readonly showFilters = signal(false);

  // Pagination state
  readonly currentPage = signal(1);
  readonly itemsPerPage = signal(10);
  readonly pageOptions = [10, 25, 50, 100];

  // Computed: filtered products based on search
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
    return Math.ceil(filtered.length / perPage);
  });

  // Computed: page numbers to display
  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    // Show max 5 page numbers
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);

    // Adjust start if we're near the end
    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  });

  // Computed: statistics
  readonly stats = computed(() => {
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

  toggleFilters(): void {
    this.showFilters.update(v => !v);
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
   * Get total stock for a product
   */
  getTotalStock(product: any): number {
    return product.variants?.reduce((sum: number, v: any) => sum + (v.stockOnHand || 0), 0) || 0;
  }

  /**
   * Get price range for a product
   */
  getPriceRange(product: any): string {
    if (!product.variants || product.variants.length === 0) return 'N/A';

    const prices = product.variants.map((v: any) => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    if (minPrice === maxPrice) {
      return this.formatPrice(minPrice);
    }

    return `${this.formatPrice(minPrice)} - ${this.formatPrice(maxPrice)}`;
  }

  /**
   * Format price from cents to currency
   */
  formatPrice(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  /**
   * Get product thumbnail
   */
  getProductThumbnail(product: any): string {
    return product.featuredAsset?.preview || 'https://picsum.photos/200/200';
  }

  /**
   * Track by function for ngFor performance
   */
  trackByProductId(index: number, product: any): string {
    return product.id;
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this.productService.clearError();
  }

  /**
   * Math utilities for template
   */
  readonly Math = Math;
}

