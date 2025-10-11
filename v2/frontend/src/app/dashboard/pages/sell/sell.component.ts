import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  BarcodeResult,
  BarcodeScannerService,
} from '../../../core/services/barcode-scanner.service';
import { CameraService } from '../../../core/services/camera.service';
import { MlModelService, ModelPrediction } from '../../../core/services/ml-model.service';
import {
  ProductSearchResult,
  ProductSearchService,
  ProductVariant,
} from '../../../core/services/product-search.service';

/**
 * POS Configuration
 */
interface POSConfig {
  confidenceThreshold: number;
  detectionIntervalMs: number;
  enableMLDetection: boolean;
  enableBarcodeScanning: boolean;
  channelId: string;
  cashierFlow: boolean; // Global toggle for cashier flow
}

/**
 * Cart item structure
 */
interface CartItem {
  variant: ProductVariant;
  quantity: number;
  subtotal: number;
}

/**
 * Customer structure
 */
interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

/**
 * Payment method types (hook only - no implementation yet)
 */
type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER';

/**
 * Scanner status
 */
type ScannerStatus =
  | 'idle'
  | 'initializing'
  | 'loading_model'
  | 'ready'
  | 'scanning'
  | 'detecting'
  | 'error';

@Component({
  selector: 'app-sell',
  imports: [CommonModule, FormsModule],
  templateUrl: './sell.component.html',
  styleUrl: './sell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellComponent implements OnInit, OnDestroy {
  // Services (mlModelService is public for template access)
  readonly mlModelService = inject(MlModelService);
  private readonly cameraService = inject(CameraService);
  private readonly barcodeService = inject(BarcodeScannerService);
  private readonly productSearchService = inject(ProductSearchService);

  // View references
  readonly videoElement = viewChild<ElementRef<HTMLVideoElement>>('cameraView');

  // Configuration
  readonly config = signal<POSConfig>({
    confidenceThreshold: 0.9,
    detectionIntervalMs: 1200,
    enableMLDetection: true,
    enableBarcodeScanning: true,
    channelId: 'T_1', // TODO: Get from auth/company service
    cashierFlow: true, // Manual initialization as requested
  });

  // Scanner state
  readonly scannerStatus = signal<ScannerStatus>('idle');
  readonly scannerError = signal<string | null>(null);
  readonly mlModelError = computed(() => this.mlModelService.error());
  readonly hasMlModel = computed(() => this.mlModelService.isInitialized());
  readonly isScanning = signal<boolean>(false);
  readonly detectedProduct = signal<ProductSearchResult | null>(null);
  readonly showConfirmModal = signal<boolean>(false);

  // Search state
  searchTerm = ''; // Regular property for ngModel two-way binding
  readonly searchResults = signal<ProductSearchResult[]>([]);
  readonly isSearching = signal<boolean>(false);

  // Cart state
  readonly cartItems = signal<CartItem[]>([]);
  readonly cartSubtotal = computed(() =>
    this.cartItems().reduce((sum, item) => sum + item.subtotal, 0)
  );
  readonly cartTax = computed(() => this.cartSubtotal() * 0.0); // TODO: Configure tax rate
  readonly cartTotal = computed(() => this.cartSubtotal() + this.cartTax());
  readonly cartItemCount = computed(() =>
    this.cartItems().reduce((sum, item) => sum + item.quantity, 0)
  );

  // Detection loop
  private detectionInterval: any = null;

  // Cart modal state
  readonly showCartModal = signal<boolean>(false);

  // Checkout modal state
  readonly showCheckoutModal = signal<boolean>(false);
  readonly checkoutType = signal<'credit' | 'cashier' | 'cash' | null>(null);
  readonly isProcessingCheckout = signal<boolean>(false);
  readonly checkoutError = signal<string | null>(null);

  // Customer management state
  readonly customerSearchTerm = signal<string>('');
  readonly customerSearchResults = signal<Customer[]>([]);
  readonly isSearchingCustomers = signal<boolean>(false);
  readonly selectedCustomer = signal<Customer | null>(null);
  readonly showCustomerForm = signal<boolean>(false);

  // New customer form
  readonly newCustomerName = signal<string>('');
  readonly newCustomerPhone = signal<string>('');
  readonly newCustomerEmail = signal<string>('');

  // Payment method state (hook only)
  readonly selectedPaymentMethod = signal<PaymentMethod | null>(null);

  // Computed status message
  readonly statusMessage = computed(() => {
    const status = this.scannerStatus();
    const error = this.scannerError();

    const messages: Record<ScannerStatus, string> = {
      idle: 'Scanner inactive',
      initializing: 'Initializing scanner...',
      loading_model: 'Loading AI model...',
      ready: 'Scanner ready - point camera at product',
      scanning: 'Scanning for products...',
      detecting: 'Product detected! Verifying...',
      error: error || 'Scanner error',
    };

    return messages[status];
  });

  readonly canStartScanner = computed(() => {
    const status = this.scannerStatus();
    return status === 'idle' || status === 'ready';
  });

  ngOnInit(): void {
    this.initializeScanner();
  }

  ngOnDestroy(): void {
    this.stopScanner();
    this.mlModelService.unloadModel();
  }

  /**
   * Initialize scanner components
   */
  private async initializeScanner(): Promise<void> {
    this.scannerStatus.set('initializing');

    try {
      // Check if camera is available
      const cameraAvailable = await this.cameraService.isCameraAvailable();
      if (!cameraAvailable) {
        this.scannerError.set('No camera found on this device');
        this.scannerStatus.set('error');
        return;
      }

      // Initialize barcode scanner if enabled
      if (this.config().enableBarcodeScanning && this.barcodeService.isSupported()) {
        await this.barcodeService.initialize();
      }

      // Load ML model if enabled
      if (this.config().enableMLDetection) {
        this.scannerStatus.set('loading_model');
        const modelLoaded = await this.mlModelService.loadModel(this.config().channelId);

        if (!modelLoaded) {
          const error = this.mlModelService.error();
          console.warn('ML model not available:', error?.message);

          // Disable ML detection but continue with manual search
          this.config.update((c) => ({ ...c, enableMLDetection: false }));

          // Show non-blocking warning (scanner still works)
          this.scannerError.set(
            error?.message || 'ML product recognition unavailable. Use manual search instead.'
          );
        }
      }

      this.scannerStatus.set('ready');
      console.log('Scanner initialized successfully');

      // Auto-start on mobile
      if (this.isMobileDevice()) {
        setTimeout(() => this.startScanner(), 500);
      }
    } catch (error: any) {
      console.error('Scanner initialization failed:', error);
      this.scannerError.set(error.message);
      this.scannerStatus.set('error');
    }
  }

  /**
   * Start camera and detection
   */
  async startScanner(): Promise<void> {
    if (!this.canStartScanner()) {
      console.warn('Cannot start scanner in current state:', this.scannerStatus());
      return;
    }

    const videoEl = this.videoElement()?.nativeElement;
    if (!videoEl) {
      this.scannerError.set('Video element not found');
      this.scannerStatus.set('error');
      return;
    }

    try {
      // Start camera
      const started = await this.cameraService.startCamera(videoEl);
      if (!started) {
        this.scannerError.set(this.cameraService.error() || 'Failed to start camera');
        this.scannerStatus.set('error');
        return;
      }

      this.isScanning.set(true);
      this.scannerStatus.set('scanning');

      // Start detection loops
      this.startDetectionLoops(videoEl);

      console.log('Scanner started');
    } catch (error: any) {
      console.error('Failed to start scanner:', error);
      this.scannerError.set(error.message);
      this.scannerStatus.set('error');
    }
  }

  /**
   * Stop scanner
   */
  stopScanner(): void {
    // Stop detection loops
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    this.barcodeService.stopScanning();

    // Stop camera
    const videoEl = this.videoElement()?.nativeElement;
    if (videoEl) {
      this.cameraService.stopCamera(videoEl);
    }

    this.isScanning.set(false);
    this.scannerStatus.set('ready');
    console.log('Scanner stopped');
  }

  /**
   * Toggle scanner on/off
   */
  toggleScanner(): void {
    if (this.isScanning()) {
      this.stopScanner();
    } else {
      this.startScanner();
    }
  }

  /**
   * Start ML and barcode detection loops
   */
  private startDetectionLoops(videoElement: HTMLVideoElement): void {
    // Start barcode scanning if enabled
    if (this.config().enableBarcodeScanning && this.barcodeService.isSupported()) {
      this.barcodeService.startScanning(
        videoElement,
        (result) => this.handleBarcodeDetection(result),
        500
      );
    }

    // Start ML detection if enabled
    if (this.config().enableMLDetection && this.mlModelService.isInitialized()) {
      this.detectionInterval = setInterval(() => {
        this.runMLDetection(videoElement);
      }, this.config().detectionIntervalMs);
    }
  }

  /**
   * Run ML model prediction
   */
  private async runMLDetection(videoElement: HTMLVideoElement): Promise<void> {
    if (
      !this.isScanning() ||
      !videoElement.videoWidth ||
      videoElement.paused ||
      videoElement.ended
    ) {
      return;
    }

    try {
      const predictions = await this.mlModelService.predict(videoElement, 3);
      const bestPrediction = predictions[0];

      if (
        bestPrediction &&
        bestPrediction.probability >= this.config().confidenceThreshold
      ) {
        console.log('ML Detection:', bestPrediction);
        this.scannerStatus.set('detecting');
        await this.handleMLDetection(bestPrediction);
      }
    } catch (error) {
      console.error('ML detection error:', error);
    }
  }

  /**
   * Handle ML model detection
   */
  private async handleMLDetection(prediction: ModelPrediction): Promise<void> {
    this.stopScanner();

    const productId = this.mlModelService.getProductIdFromLabel(prediction.className);
    const product = await this.productSearchService.getProductById(productId);

    if (product) {
      this.detectedProduct.set(product);
      this.showConfirmModal.set(true);
    } else {
      this.scannerError.set(`Product not found: ${productId}`);
      this.scannerStatus.set('error');
    }
  }

  /**
   * Handle barcode detection
   */
  private async handleBarcodeDetection(result: BarcodeResult): Promise<void> {
    console.log('Barcode detected:', result);
    this.stopScanner();

    const variant = await this.productSearchService.searchByBarcode(result.rawValue);

    if (variant) {
      // Create a product result from variant
      const product: ProductSearchResult = {
        id: variant.productId,
        name: variant.productName,
        variants: [variant],
        featuredAsset: variant.featuredAsset,
      };

      this.detectedProduct.set(product);
      this.showConfirmModal.set(true);
    } else {
      this.scannerError.set(`Product not found for barcode: ${result.rawValue}`);
      this.scannerStatus.set('error');
    }
  }

  /**
   * Search products by name or SKU
   */
  async searchProducts(): Promise<void> {
    const term = this.searchTerm.trim();

    if (term.length < 2) {
      this.searchResults.set([]);
      return;
    }

    this.isSearching.set(true);

    try {
      const results = await this.productSearchService.searchProducts(term);
      this.searchResults.set(results);
    } catch (error) {
      console.error('Search failed:', error);
      this.searchResults.set([]);
    } finally {
      this.isSearching.set(false);
    }
  }

  /**
   * Select product from search results
   */
  selectProduct(product: ProductSearchResult): void {
    this.detectedProduct.set(product);
    this.showConfirmModal.set(true);
    this.searchTerm = '';
    this.searchResults.set([]);
  }

  /**
   * Add product to cart from confirmation modal
   */
  addToCart(variant: ProductVariant, quantity: number): void {
    const items = this.cartItems();
    const existingIndex = items.findIndex((item) => item.variant.id === variant.id);

    if (existingIndex >= 0) {
      // Update existing item
      items[existingIndex].quantity += quantity;
      items[existingIndex].subtotal = items[existingIndex].quantity * variant.priceWithTax;
    } else {
      // Add new item
      items.push({
        variant,
        quantity,
        subtotal: quantity * variant.priceWithTax,
      });
    }

    this.cartItems.set([...items]);
    this.showConfirmModal.set(false);
    this.detectedProduct.set(null);

    console.log('Added to cart:', variant.name, 'x', quantity);

    // Provide visual feedback but don't keep cart modal open
    // Cart is now accessed via FAB for a cleaner experience
  }

  /**
   * Update cart item quantity
   */
  updateCartItemQuantity(variantId: string, quantity: number): void {
    const items = this.cartItems();
    const item = items.find((i) => i.variant.id === variantId);

    if (item) {
      if (quantity <= 0) {
        this.removeFromCart(variantId);
      } else {
        item.quantity = quantity;
        item.subtotal = quantity * item.variant.priceWithTax;
        this.cartItems.set([...items]);
      }
    }
  }

  /**
   * Remove item from cart
   */
  removeFromCart(variantId: string): void {
    this.cartItems.set(this.cartItems().filter((item) => item.variant.id !== variantId));
  }

  /**
   * Clear entire cart
   */
  clearCart(): void {
    this.cartItems.set([]);
  }

  /**
   * Initiate checkout - opens checkout modal
   */
  async checkout(): Promise<void> {
    if (this.cartItems().length === 0) {
      return;
    }

    this.closeCartModal();
    this.showCheckoutModal.set(true);
    this.checkoutError.set(null);
  }

  /**
   * Handle credit sale selection
   */
  handleCreditSale(): void {
    this.checkoutType.set('credit');
    this.selectedCustomer.set(null);
    this.customerSearchTerm.set('');
    this.customerSearchResults.set([]);
    this.showCustomerForm.set(false);
  }

  /**
   * Handle cashier flow selection
   */
  handleCashierFlow(): void {
    this.checkoutType.set('cashier');
  }

  /**
   * Handle cash sale selection
   */
  handleCashSale(): void {
    this.checkoutType.set('cash');
    this.selectedPaymentMethod.set(null);
  }

  /**
   * Search for customers (for credit sales)
   */
  async searchCustomers(): Promise<void> {
    const term = this.customerSearchTerm().trim();

    if (term.length < 2) {
      this.customerSearchResults.set([]);
      return;
    }

    this.isSearchingCustomers.set(true);

    try {
      // TODO: Implement actual customer search via GraphQL
      // For now, mock results
      await new Promise(resolve => setTimeout(resolve, 300));

      // Mock customer results
      const mockCustomers: Customer[] = [
        { id: '1', name: `Customer matching "${term}"`, phone: '+254712345678' },
        { id: '2', name: `Another ${term}`, phone: '+254787654321', email: 'test@example.com' },
      ];

      this.customerSearchResults.set(mockCustomers);
    } catch (error) {
      console.error('Customer search failed:', error);
      this.customerSearchResults.set([]);
    } finally {
      this.isSearchingCustomers.set(false);
    }
  }

  /**
   * Select a customer from search results
   */
  selectCustomer(customer: Customer): void {
    this.selectedCustomer.set(customer);
    this.customerSearchTerm.set('');
    this.customerSearchResults.set([]);
    this.showCustomerForm.set(false);
  }

  /**
   * Show form to create new customer
   */
  showNewCustomerForm(): void {
    this.showCustomerForm.set(true);
    this.newCustomerName.set('');
    this.newCustomerPhone.set('');
    this.newCustomerEmail.set('');
  }

  /**
   * Cancel new customer creation
   */
  cancelNewCustomer(): void {
    this.showCustomerForm.set(false);
    this.newCustomerName.set('');
    this.newCustomerPhone.set('');
    this.newCustomerEmail.set('');
  }

  /**
   * Create new customer (basic details only)
   */
  async createNewCustomer(): Promise<void> {
    const name = this.newCustomerName().trim();
    const phone = this.newCustomerPhone().trim();

    if (!name || !phone) {
      alert('Name and phone number are required');
      return;
    }

    this.isProcessingCheckout.set(true);

    try {
      // TODO: Implement actual customer creation via GraphQL
      // For now, create a mock customer
      await new Promise(resolve => setTimeout(resolve, 500));

      const newCustomer: Customer = {
        id: `new-${Date.now()}`,
        name,
        phone,
        email: this.newCustomerEmail().trim() || undefined,
      };

      this.selectedCustomer.set(newCustomer);
      this.showCustomerForm.set(false);
      this.newCustomerName.set('');
      this.newCustomerPhone.set('');
      this.newCustomerEmail.set('');
    } catch (error) {
      console.error('Failed to create customer:', error);
      alert('Failed to create customer. Please try again.');
    } finally {
      this.isProcessingCheckout.set(false);
    }
  }

  /**
   * Select payment method (hook only - no implementation)
   */
  selectPaymentMethod(method: PaymentMethod): void {
    this.selectedPaymentMethod.set(method);
  }

  /**
   * Complete credit sale
   */
  async completeCreditSale(): Promise<void> {
    if (!this.selectedCustomer()) {
      this.checkoutError.set('Please select or create a customer');
      return;
    }

    this.isProcessingCheckout.set(true);
    this.checkoutError.set(null);

    try {
      // TODO: Implement order creation with Vendure
      // Order should be created with status for credit (payment due later)
      console.log('Creating credit sale:', {
        customer: this.selectedCustomer(),
        items: this.cartItems(),
        total: this.cartTotal(),
      });

      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call

      // Success
      this.clearCart();
      this.closeCheckoutModal();
      alert(`Credit sale created successfully for ${this.selectedCustomer()?.name}`);
    } catch (error) {
      console.error('Credit sale failed:', error);
      this.checkoutError.set('Failed to create credit sale. Please try again.');
    } finally {
      this.isProcessingCheckout.set(false);
    }
  }

  /**
   * Complete cashier flow (submit to cashier for payment)
   */
  async completeCashierFlow(): Promise<void> {
    this.isProcessingCheckout.set(true);
    this.checkoutError.set(null);

    try {
      // TODO: Implement order creation with PENDING_PAYMENT status
      // This follows the two-step process from POS_README.md
      console.log('Submitting to cashier:', {
        items: this.cartItems(),
        total: this.cartTotal(),
        status: 'PENDING_PAYMENT',
      });

      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call

      // Success - order created, awaiting cashier payment validation
      this.clearCart();
      this.closeCheckoutModal();
      alert('Order submitted to cashier! Pro-forma invoice will be printed.');
    } catch (error) {
      console.error('Cashier submission failed:', error);
      this.checkoutError.set('Failed to submit to cashier. Please try again.');
    } finally {
      this.isProcessingCheckout.set(false);
    }
  }

  /**
   * Complete cash sale
   */
  async completeCashSale(): Promise<void> {
    if (!this.selectedPaymentMethod()) {
      this.checkoutError.set('Please select a payment method');
      return;
    }

    this.isProcessingCheckout.set(true);
    this.checkoutError.set(null);

    try {
      // TODO: Implement order creation with Vendure
      // Order should be created with immediate payment
      console.log('Creating cash sale:', {
        paymentMethod: this.selectedPaymentMethod(),
        items: this.cartItems(),
        total: this.cartTotal(),
      });

      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call

      // Success
      this.clearCart();
      this.closeCheckoutModal();
      alert(`Cash sale completed successfully! Payment method: ${this.selectedPaymentMethod()}`);
    } catch (error) {
      console.error('Cash sale failed:', error);
      this.checkoutError.set('Failed to complete sale. Please try again.');
    } finally {
      this.isProcessingCheckout.set(false);
    }
  }

  /**
   * Close checkout modal
   */
  closeCheckoutModal(): void {
    this.showCheckoutModal.set(false);
    this.checkoutType.set(null);
    this.checkoutError.set(null);
    this.selectedCustomer.set(null);
    this.selectedPaymentMethod.set(null);
    this.customerSearchTerm.set('');
    this.customerSearchResults.set([]);
    this.showCustomerForm.set(false);
  }

  /**
   * Close confirmation modal
   */
  closeConfirmModal(): void {
    this.showConfirmModal.set(false);
    this.detectedProduct.set(null);
  }

  /**
   * Check if device is mobile
   */
  private isMobileDevice(): boolean {
    return navigator.maxTouchPoints > 0 && window.innerWidth < 768;
  }

  /**
   * Scroll to cart section (mobile UX enhancement)
   * Provides quick access to cart when camera/scanner takes up viewport
   */
  scrollToCart(): void {
    const cartSection = document.getElementById('cart-section');
    if (cartSection) {
      // Haptic feedback on mobile devices
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      cartSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Brief visual feedback
      cartSection.classList.add('ring-2', 'ring-primary');
      setTimeout(() => {
        cartSection.classList.remove('ring-2', 'ring-primary');
      }, 1000);
    }
  }

  /**
   * Update confidence threshold
   */
  updateConfidenceThreshold(value: number): void {
    this.config.update((c) => ({ ...c, confidenceThreshold: value / 100 }));
  }

  /**
   * Open cart modal
   */
  openCartModal(): void {
    this.showCartModal.set(true);
  }

  /**
   * Close cart modal
   */
  closeCartModal(): void {
    this.showCartModal.set(false);
  }

}
