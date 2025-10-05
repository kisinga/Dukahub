import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { ApolloService } from './apollo.service';
import { gql } from '@apollo/client';

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
 * GraphQL queries for cart operations
 */
const GET_ACTIVE_ORDER = gql`
  query GetActiveOrder {
    activeOrder {
      id
      code
      state
      totalQuantity
      subTotal
      shipping
      total
      lines {
        id
        quantity
        unitPrice
        linePrice
        productVariant {
          id
          name
          product {
            id
            name
          }
        }
      }
    }
  }
`;

const ADD_TO_CART = gql`
  mutation AddItemToOrder($productVariantId: ID!, $quantity: Int!) {
    addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
      ... on Order {
        id
        code
        totalQuantity
      }
      ... on OrderModificationError {
        errorCode
        message
      }
      ... on OrderLimitError {
        errorCode
        message
      }
      ... on NegativeQuantityError {
        errorCode
        message
      }
      ... on InsufficientStockError {
        errorCode
        message
      }
    }
  }
`;

const REMOVE_FROM_CART = gql`
  mutation RemoveOrderLine($orderLineId: ID!) {
    removeOrderLine(orderLineId: $orderLineId) {
      ... on Order {
        id
        totalQuantity
      }
      ... on OrderModificationError {
        errorCode
        message
      }
    }
  }
`;

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
   * Only available for authenticated users
   */
  async fetchCart(): Promise<void> {
    if (!this.authService.isAuthenticated()) {
      console.warn('Cannot fetch cart: user not authenticated');
      return;
    }

    this.isLoadingSignal.set(true);

    try {
      const client = this.apolloService.getClient();
      const { data } = await client.query({
        query: GET_ACTIVE_ORDER,
        fetchPolicy: 'network-only',
      });

      if (data?.activeOrder) {
        const order = data.activeOrder;
        const items: CartItem[] = order.lines.map((line: any) => ({
          id: line.id,
          productVariantId: line.productVariant.id,
          productName: line.productVariant.product.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          totalPrice: line.linePrice,
        }));

        this.cartItemsSignal.set(items);
      } else {
        this.cartItemsSignal.set([]);
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
      this.cartItemsSignal.set([]);
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Add item to cart
   */
  async addToCart(productVariantId: string, quantity: number): Promise<boolean> {
    if (!this.authService.isAuthenticated()) {
      console.warn('Cannot add to cart: user not authenticated');
      return false;
    }

    this.isLoadingSignal.set(true);

    try {
      const client = this.apolloService.getClient();
      const { data, errors } = await client.mutate({
        mutation: ADD_TO_CART,
        variables: { productVariantId, quantity },
      });

      if (errors && errors.length > 0) {
        console.error('Add to cart error:', errors[0].message);
        return false;
      }

      const result = data?.addItemToOrder;

      if (result?.__typename === 'Order') {
        // Refresh cart
        await this.fetchCart();
        return true;
      }

      if (result?.errorCode) {
        console.error('Add to cart error:', result.message);
        return false;
      }

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
   */
  async removeFromCart(orderLineId: string): Promise<boolean> {
    if (!this.authService.isAuthenticated()) {
      console.warn('Cannot remove from cart: user not authenticated');
      return false;
    }

    this.isLoadingSignal.set(true);

    try {
      const client = this.apolloService.getClient();
      const { data, errors } = await client.mutate({
        mutation: REMOVE_FROM_CART,
        variables: { orderLineId },
      });

      if (errors && errors.length > 0) {
        console.error('Remove from cart error:', errors[0].message);
        return false;
      }

      const result = data?.removeOrderLine;

      if (result?.__typename === 'Order') {
        // Refresh cart
        await this.fetchCart();
        return true;
      }

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
}

