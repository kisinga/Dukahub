import { Injectable, computed, inject, signal } from '@angular/core';
import { ApolloService } from './apollo.service';
import { AuthService } from './auth.service';

/**
 * Cart item interface
 */
export interface CartItem {
  id: string;
  productVariantId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/**
 * Cart summary interface
 */
export interface CartSummary {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

/**
 * TODO: Implement admin-api order management
 * The shop-api cart operations (activeOrder, addItemToOrder, removeOrderLine) 
 * are not available in admin-api. For admin panel, we should use:
 * - createDraftOrder
 * - addItemToDraftOrder
 * - removeDraftOrderLine
 * 
 * For now, this service provides a stub implementation
 */

/**
 * Scoped service for managing shopping cart
 * This demonstrates a service that depends on authentication
 */
@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly authService = inject(AuthService);
  private readonly apolloService = inject(ApolloService);

  // Cart state signals
  private readonly cartItemsSignal = signal<CartItem[]>([]);
  private readonly isLoadingSignal = signal<boolean>(false);

  // Public computed signals
  readonly cartItems = this.cartItemsSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly totalItems = computed(() =>
    this.cartItemsSignal().reduce((sum, item) => sum + item.quantity, 0)
  );
  readonly subtotal = computed(() =>
    this.cartItemsSignal().reduce((sum, item) => sum + item.totalPrice, 0)
  );
  readonly isEmpty = computed(() => this.cartItemsSignal().length === 0);

  /**
   * Fetch active cart/order
   * TODO: Implement using admin-api draft orders
   */
  async fetchCart(): Promise<void> {
    if (!this.authService.isAuthenticated()) {
      console.warn('Cannot fetch cart: user not authenticated');
      return;
    }

    this.isLoadingSignal.set(true);

    try {
      // TODO: Implement with createDraftOrder or fetch existing draft orders
      console.log('Cart fetching not yet implemented for admin-api');
      this.cartItemsSignal.set([]);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
      this.cartItemsSignal.set([]);
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Add item to cart
   * TODO: Implement using admin-api draft orders
   */
  async addToCart(productVariantId: string, quantity: number): Promise<boolean> {
    if (!this.authService.isAuthenticated()) {
      console.warn('Cannot add to cart: user not authenticated');
      return false;
    }

    this.isLoadingSignal.set(true);

    try {
      // TODO: Implement with addItemToDraftOrder
      console.log('Add to cart not yet implemented for admin-api', { productVariantId, quantity });
      return false;
    } catch (error) {
      console.error('Failed to add to cart:', error);
      return false;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Remove item from cart
   * TODO: Implement using admin-api draft orders
   */
  async removeFromCart(orderLineId: string): Promise<boolean> {
    if (!this.authService.isAuthenticated()) {
      console.warn('Cannot remove from cart: user not authenticated');
      return false;
    }

    this.isLoadingSignal.set(true);

    try {
      // TODO: Implement with removeDraftOrderLine
      console.log('Remove from cart not yet implemented for admin-api', { orderLineId });
      return false;
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      return false;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Clear entire cart
   */
  clearCart(): void {
    this.cartItemsSignal.set([]);
  }

  /**
   * Get cart summary
   */
  getCartSummary(): CartSummary {
    const items = this.cartItemsSignal();
    const subtotal = this.subtotal();
    const shipping = 0; // Calculate based on your business logic
    const tax = 0; // Calculate based on your business logic
    const total = subtotal + shipping + tax;

    return {
      items,
      totalItems: this.totalItems(),
      subtotal,
      shipping,
      tax,
      total,
    };
  }

  /**
   * Add item locally (for POS quick add)
   * This is a local-only operation for the POS system
   */
  addItemLocal(productVariantId: string, productName: string, quantity: number, unitPrice: number): void {
    const items = this.cartItemsSignal();
    const existingItem = items.find((item) => item.productVariantId === productVariantId);

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.totalPrice = existingItem.quantity * existingItem.unitPrice;
    } else {
      items.push({
        id: `temp-${Date.now()}`,
        productVariantId,
        productName,
        quantity,
        unitPrice,
        totalPrice: quantity * unitPrice,
      });
    }

    this.cartItemsSignal.set([...items]);
  }

  /**
   * Update item quantity locally
   */
  updateItemQuantityLocal(productVariantId: string, quantity: number): void {
    const items = this.cartItemsSignal();
    const item = items.find((i) => i.productVariantId === productVariantId);

    if (item) {
      if (quantity <= 0) {
        this.removeItemLocal(productVariantId);
      } else {
        item.quantity = quantity;
        item.totalPrice = quantity * item.unitPrice;
        this.cartItemsSignal.set([...items]);
      }
    }
  }

  /**
   * Remove item locally
   */
  removeItemLocal(productVariantId: string): void {
    const items = this.cartItemsSignal();
    this.cartItemsSignal.set(items.filter((item) => item.productVariantId !== productVariantId));
  }
}

