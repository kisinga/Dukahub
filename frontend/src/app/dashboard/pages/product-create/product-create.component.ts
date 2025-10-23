import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
    computed,
    inject,
    signal,
    viewChild
} from '@angular/core';
import {
    FormArray,
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CompanyService } from '../../../core/services/company.service';
import { ProductService } from '../../../core/services/product.service';
import { StockLocationService } from '../../../core/services/stock-location.service';
import { BarcodeScannerComponent } from './components/barcode-scanner.component';
import { PhotoManagerComponent } from './components/photo-manager.component';

/**
 * Item Creation Component (Products & Services)
 * 
 * ARCHITECTURE: 1 Product = Multiple Independent SKUs (KISS - No Option Groups)
 * 
 * FLOW:
 * 1. Identify product: Barcode OR Label/Card Photos
 * 2. Name product: "Tomatoes", "Haircut", "Coca Cola"
 * 3. Add SKUs: Each with name, price, stock (e.g., "1kg @ 100/=", "2kg @ 180/=")
 * 
 * EXAMPLES:
 * - Tomatoes: 1kg@100/=, 2kg@180/=, 5kg@400/=
 * - Haircut: Kids@300/=, Regular@500/=, Premium@800/=
 * - Coca Cola: 300ml@50/=, 500ml@80/=, 1L@120/=
 * 
 * DESIGN (KISS - Mobile-First):
 * - No complex option groups
 * - Simple SKU list with add/remove
 * - Each SKU is independent
 */
@Component({
    selector: 'app-product-create',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        PhotoManagerComponent,
        BarcodeScannerComponent,
    ],
    templateUrl: './product-create.component.html',
    styleUrl: './product-create.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCreateComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly productService = inject(ProductService);
    private readonly stockLocationService = inject(StockLocationService);
    readonly companyService = inject(CompanyService);

    // View references
    readonly photoManager = viewChild<PhotoManagerComponent>('photoManager');
    readonly barcodeScanner = viewChild<BarcodeScannerComponent>('barcodeScanner');

    // Edit mode
    readonly isEditMode = signal(false);
    readonly productId = signal<string | null>(null);

    // Item type toggle (product vs service)
    readonly itemType = signal<'product' | 'service'>('product');

    // Form: Product + Multiple SKUs
    readonly productForm: FormGroup;

    // Unique suffix for this form session (to ensure SKU uniqueness)
    private readonly skuUniqueSuffix = Date.now().toString().slice(-6);

    // Computed: SKUs FormArray
    get skus(): FormArray {
        return this.productForm.get('skus') as FormArray;
    }

    // Submission state
    readonly isSubmitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly submitSuccess = signal(false);

    // Computed: Combined loading state (component + service)
    readonly isLoading = computed(() => this.isSubmitting() || this.productService.isCreating());

    // Default location for the active channel
    readonly defaultLocation = computed(() => this.stockLocationService.getDefaultLocation());

    // Identification method chosen
    readonly identificationMethod = signal<'barcode' | 'label-photos' | null>(null);
    readonly photoCount = signal(0);
    readonly barcodeValue = signal<string>(''); // Track barcode as signal
    readonly productNameValue = signal<string>(''); // Track name as signal
    readonly productNameValid = signal<boolean>(false); // Track name validity
    readonly skuValidityTrigger = signal<number>(0); // Trigger to recompute SKU validation
    readonly formValid = signal<boolean>(false); // Track overall form validity

    // Computed: Has valid identification
    readonly hasValidIdentification = computed(() => {
        const method = this.identificationMethod();
        if (method === 'barcode') {
            return !!this.barcodeValue()?.trim();
        }
        if (method === 'label-photos') {
            return this.photoCount() >= 5;
        }
        return false;
    });

    // Computed: Form validity
    readonly canSubmit = computed(() => {
        const isValid = this.formValid(); // Use signal instead of direct form access
        const notLoading = !this.isLoading();
        const hasLocation = !!this.defaultLocation();
        const hasIdentification = this.hasValidIdentification();

        return isValid && notLoading && hasLocation && hasIdentification;
    });

    // Computed: Validation issues
    readonly validationIssues = computed(() => {
        const issues: string[] = [];
        const type = this.itemType();

        if (!this.hasValidIdentification()) {
            const photoType = type === 'service' ? 'card' : 'label';
            issues.push(`Barcode OR 5+ ${photoType} photos`);
        }
        if (!this.productNameValid()) issues.push('Product name required');

        // SKU validation (trigger ensures recomputation)
        this.skuValidityTrigger(); // Access signal to track changes

        if (this.skus.length === 0) {
            issues.push('At least 1 SKU required');
        } else {
            // Check for invalid SKUs - must have name, sku, and price
            const invalidSkus = this.skus.controls.filter(sku => {
                const name = sku.get('name');
                const skuCode = sku.get('sku');
                const price = sku.get('price');
                const stock = sku.get('stockOnHand');

                // For services, stock is not validated
                const isService = type === 'service';

                return (
                    (name?.invalid) ||
                    (skuCode?.invalid) ||
                    (price?.invalid) ||
                    (!isService && stock?.invalid)
                );
            }).length;

            if (invalidSkus > 0) {
                issues.push(`${invalidSkus} SKU(s) have errors`);
            }

            // Check for duplicate SKU codes
            const skuCodes = this.skus.controls
                .map(sku => sku.get('sku')?.value?.trim().toUpperCase())
                .filter(code => code);
            const uniqueSkuCodes = new Set(skuCodes);
            if (skuCodes.length !== uniqueSkuCodes.size) {
                issues.push('Duplicate SKU codes detected');
            }
        }

        if (type === 'product' && !this.defaultLocation()) {
            issues.push('No location selected');
        }

        return issues;
    });

    constructor() {
        // Initialize form: Product info + Multiple SKUs
        this.productForm = this.fb.group({
            // Product level - Identification (choose ONE method)
            barcode: [''], // Method 1: Scan/enter barcode (for packaged goods)
            // Method 2: Label photos handled via PhotoManagerComponent (for fresh produce)

            // Product level - Basic info
            name: ['', [Validators.required, Validators.minLength(3)]],

            // SKU level - Multiple variants (FormArray)
            skus: this.fb.array([]), // Start empty, will add one SKU in ngOnInit
        });
    }

    async ngOnInit(): Promise<void> {
        // Check if we're in edit mode
        const productId = this.route.snapshot.paramMap.get('id');
        if (productId) {
            this.isEditMode.set(true);
            this.productId.set(productId);
            await this.loadProductForEdit(productId);
        }

        // Stock locations are loaded on boot via AppInitService
        // Just check if active location is set
        if (!this.defaultLocation()) {
            this.submitError.set('No active location selected. Please select a location from the navbar.');
        }

        // Add first SKU by default if not in edit mode
        if (!this.isEditMode()) {
            this.addSku();
        }

        // Watch for manual barcode entry
        this.productForm.get('barcode')?.valueChanges.subscribe(value => {
            // Update signal to trigger reactive updates
            this.barcodeValue.set(value || '');

            const trimmedValue = value?.trim();
            if (trimmedValue && trimmedValue.length > 0) {
                // User is typing a barcode - auto-select barcode method
                if (this.identificationMethod() !== 'barcode') {
                    this.identificationMethod.set('barcode');
                }
            }
        });

        // Watch for product name changes
        this.productForm.get('name')?.valueChanges.subscribe(value => {
            this.productNameValue.set(value || '');
            const control = this.productForm.get('name');
            this.productNameValid.set(control?.valid || false);
        });

        // Watch for SKU array changes
        this.skus.valueChanges.subscribe(() => {
            // Trigger recomputation of SKU validation
            this.skuValidityTrigger.update(v => v + 1);
            // Update form validity
            this.formValid.set(this.productForm.valid);
        });

        this.skus.statusChanges.subscribe(() => {
            // Trigger recomputation when validity changes
            this.skuValidityTrigger.update(v => v + 1);
            // Update form validity
            this.formValid.set(this.productForm.valid);
        });

        // Watch for overall form validity changes
        this.productForm.statusChanges.subscribe(() => {
            this.formValid.set(this.productForm.valid);
        });

        // Initialize signals with current values
        this.productNameValue.set(this.productForm.get('name')?.value || '');
        this.productNameValid.set(this.productForm.get('name')?.valid || false);
        this.barcodeValue.set(this.productForm.get('barcode')?.value || '');
        this.formValid.set(this.productForm.valid);
    }

    /**
     * Create a new SKU FormGroup
     * Stock validation is conditional: required for products, optional for services
     */
    private createSkuFormGroup(skuCode: string = '', name: string = '', price: number = 0, stock: number = 0): FormGroup {
        const isService = this.itemType() === 'service';

        return this.fb.group({
            name: [name, [Validators.required, Validators.minLength(1)]],
            sku: [skuCode, [Validators.required, Validators.minLength(1), Validators.maxLength(50)]],
            price: [price, [Validators.required, Validators.min(0.01)]],
            stockOnHand: [
                stock,
                isService ? [] : [Validators.required, Validators.min(0)]
            ],
        });
    }

    /**
     * Add a new SKU to the list
     */
    addSku(): void {
        const productName = this.productForm.get('name')?.value || '';
        const index = this.skus.length + 1;

        // Auto-generate SKU code
        const skuCode = productName
            ? `${this.generateSku(productName)}-${index}`
            : `SKU-${index}`;

        // Create SKU with pre-filled code to avoid validation issues
        const skuGroup = this.createSkuFormGroup(skuCode);
        this.skus.push(skuGroup);

        // Trigger validation update
        this.skuValidityTrigger.update(v => v + 1);
    }

    /**
     * Remove SKU at index
     */
    removeSku(index: number): void {
        if (this.skus.length > 1) {
            this.skus.removeAt(index);
            // Trigger validation update
            this.skuValidityTrigger.update(v => v + 1);
        }
    }

    /**
     * Generate SKU from product name
     */
    private generateSku(name: string): string {
        if (!name?.trim()) return '';

        return name
            .trim()
            .substring(0, 8)
            .toUpperCase()
            .replace(/\s/g, '-')
            .replace(/[^A-Z0-9-]/g, '');
    }

    /**
     * Check if SKU appears to be auto-generated from name
     */
    private isAutoGeneratedSku(sku: string, name: string): boolean {
        const generated = this.generateSku(name);
        return sku === generated;
    }

    /**
     * Choose identification method
     */
    chooseIdentificationMethod(method: 'barcode' | 'label-photos'): void {
        this.identificationMethod.set(method);

        // Clear other method
        if (method !== 'barcode') {
            this.productForm.patchValue({ barcode: '' });
            this.barcodeValue.set('');
        }
        if (method !== 'label-photos') {
            this.photoCount.set(0);
        }
    }

    /**
     * Handle barcode scanned
     */
    onBarcodeScanned(barcode: string): void {
        this.productForm.patchValue({ barcode });
        this.barcodeValue.set(barcode);
        this.identificationMethod.set('barcode');
        console.log('📦 Barcode scanned:', barcode);
    }

    /**
     * Start barcode scanner
     */
    async startBarcodeScanner(): Promise<void> {
        const scanner = this.barcodeScanner();
        if (scanner) {
            this.chooseIdentificationMethod('barcode');
            await scanner.startScanning();
        }
    }

    /**
     * Handle label photos uploaded
     */
    onPhotosChanged(count: number): void {
        this.photoCount.set(count);
        if (count >= 5) {
            this.identificationMethod.set('label-photos');
        }
    }

    /**
     * Load product data for editing
     */
    private async loadProductForEdit(productId: string): Promise<void> {
        try {
            const product = await this.productService.getProductById(productId);
            if (!product) {
                this.submitError.set('Product not found');
                return;
            }

            // Populate form with product data
            this.productForm.patchValue({
                name: product.name,
                barcode: product.customFields?.barcode || ''
            });

            // Set identification method based on existing data
            if (product.customFields?.barcode) {
                this.identificationMethod.set('barcode');
                this.barcodeValue.set(product.customFields.barcode);
            }

            // Load variants as SKUs
            if (product.variants && product.variants.length > 0) {
                product.variants.forEach((variant: any) => {
                    const skuGroup = this.createSkuFormGroup(
                        variant.sku,
                        variant.name,
                        variant.priceWithTax,
                        variant.stockOnHand || 0
                    );
                    this.skus.push(skuGroup);
                });
            }
        } catch (error: any) {
            console.error('Failed to load product:', error);
            this.submitError.set('Failed to load product data');
        }
    }

    /**
     * Toggle between product and service
     */
    toggleItemType(type: 'product' | 'service'): void {
        this.itemType.set(type);
        this.submitError.set(null);

        // Update validators for all existing SKUs
        this.updateSkuValidators();
    }

    /**
     * Update validators for all SKU forms based on current item type
     */
    private updateSkuValidators(): void {
        const isService = this.itemType() === 'service';

        this.skus.controls.forEach(skuGroup => {
            const stockControl = skuGroup.get('stockOnHand');
            if (stockControl) {
                if (isService) {
                    // Services: no stock validation
                    stockControl.clearValidators();
                    stockControl.setValue(0);
                } else {
                    // Products: stock is required
                    stockControl.setValidators([Validators.required, Validators.min(0)]);
                }
                stockControl.updateValueAndValidity();
            }
        });

        // Trigger validation update
        this.skuValidityTrigger.update(v => v + 1);
    }

    /**
     * Submit form - creates product/service with multiple SKUs
     */
    async onSubmit(): Promise<void> {
        if (!this.canSubmit()) {
            // Mark all fields as touched to show validation errors
            this.productForm.markAllAsTouched();
            this.markFormArrayTouched(this.skus);
            return;
        }

        this.isSubmitting.set(true);
        this.submitError.set(null);
        this.submitSuccess.set(false);

        try {
            const formValue = this.productForm.value;
            const type = this.itemType();

            // For products, location is required. For services, optional (no stock tracking)
            const stockLocationId = type === 'product' ? this.defaultLocation()?.id : undefined;

            if (type === 'product' && !stockLocationId) {
                this.submitError.set('No active location. Please select a location from the navbar.');
                this.isSubmitting.set(false);
                return;
            }

            // Product/Service input
            const productInput = {
                name: formValue.name.trim(),
                description: '',
                enabled: true,
                barcode: formValue.barcode?.trim() || undefined,
            };

            // Multiple variant inputs from SKUs FormArray
            // Use Vendure's native trackInventory field:
            // - trackInventory: false → Service (infinite stock, no tracking)
            // - trackInventory: true → Product (tracked stock)
            console.log('🔍 Form data before processing:', formValue);
            console.log('🔍 SKUs from form:', formValue.skus);

            const variantInputs = formValue.skus.map((sku: any, index: number) => {
                console.log(`🔍 Processing SKU ${index + 1}:`, sku);

                // Append unique suffix to SKU to prevent duplicates
                // Format: USER_SKU-TIMESTAMP-INDEX
                const uniqueSku = `${sku.sku.trim().toUpperCase()}-${this.skuUniqueSuffix}-${index + 1}`;

                if (type === 'service') {
                    return {
                        sku: uniqueSku,
                        name: sku.name.trim(),
                        price: Number(sku.price), // Use 'price' field as expected by VariantInput interface
                        trackInventory: false, // Services: infinite stock
                        stockOnHand: 0,
                        stockLocationId: undefined, // Services don't need location
                    };
                } else {
                    return {
                        sku: uniqueSku,
                        name: sku.name.trim(),
                        price: Number(sku.price), // Use 'price' field as expected by VariantInput interface
                        trackInventory: true, // Products: track stock
                        stockOnHand: Number(sku.stockOnHand),
                        stockLocationId: stockLocationId!,
                    };
                }
            });

            console.log('🔍 Final variant inputs:', variantInputs);

            const productId = await this.productService.createProductWithVariants(
                productInput,
                variantInputs
            );

            if (productId) {
                console.log('✅ Transaction Phase 1 COMPLETE: Product & Variants created');

                // Upload photos if any were added (Phase 2 - non-blocking)
                const photoManager = this.photoManager();
                if (photoManager) {
                    const photos = photoManager.getPhotos();
                    if (photos.length > 0) {
                        console.log(`📸 Transaction Phase 2: Uploading ${photos.length} photo(s)...`);
                        try {
                            const assetIds = await this.productService.uploadProductPhotos(productId, photos);
                            if (assetIds && assetIds.length > 0) {
                                console.log('✅ Transaction Phase 2 COMPLETE: Photos uploaded');
                                this.submitSuccess.set(true);
                            } else {
                                console.warn('⚠️ Transaction Phase 2 FAILED: Photos upload failed');
                                console.warn('⚠️ But product was successfully created (photos can be added later)');
                                // Show partial success message
                                this.submitError.set('Product created, but photo upload failed. You can add photos later.');
                            }
                        } catch (photoError: any) {
                            console.error('❌ Photo upload error:', photoError);
                            this.submitError.set('Product created, but photo upload failed. You can add photos later.');
                        }
                    } else {
                        console.log('📸 No photos to upload');
                        this.submitSuccess.set(true);
                    }
                } else {
                    this.submitSuccess.set(true);
                }

                // Navigate after a delay to show success/warning message
                setTimeout(() => {
                    this.router.navigate(['/dashboard/products']);
                }, 1500);
            } else {
                const error = this.productService.error();
                this.submitError.set(error || `Failed to create ${type}`);
            }
        } catch (error: any) {
            console.error(`❌ ${this.itemType()} creation failed:`, error);
            this.submitError.set(error.message || 'An unexpected error occurred');
        } finally {
            this.isSubmitting.set(false);
        }
    }

    /**
     * Submit form (wrapper for handling button click)
     */
    submitForm(): void {
        this.onSubmit();
    }

    /**
     * Cancel and go back
     */
    cancel(): void {
        if (confirm('Discard this product?')) {
            this.router.navigate(['/dashboard/products']);
        }
    }

    // --- Validation Helper Methods ---

    /**
     * Mark all controls in a FormArray as touched
     */
    private markFormArrayTouched(formArray: FormArray): void {
        formArray.controls.forEach(control => {
            if (control instanceof FormGroup) {
                Object.keys(control.controls).forEach(key => {
                    control.get(key)?.markAsTouched();
                });
            } else {
                control.markAsTouched();
            }
        });
    }

    /**
     * Check if a SKU field has an error
     */
    skuFieldHasError(skuIndex: number, fieldName: string): boolean {
        const control = this.skus.at(skuIndex)?.get(fieldName);
        return !!(control && control.invalid && (control.dirty || control.touched));
    }

    /**
     * Get error message for a SKU field
     */
    getSkuFieldError(skuIndex: number, fieldName: string): string {
        const control = this.skus.at(skuIndex)?.get(fieldName);
        if (!control?.errors) return '';

        const errors = control.errors;
        if (errors['required']) return 'Required';
        if (errors['minlength']) return `Min ${errors['minlength'].requiredLength} chars`;
        if (errors['maxlength']) return `Max ${errors['maxlength'].requiredLength} chars`;
        if (errors['min']) return `Min value: ${errors['min'].min}`;

        return 'Invalid';
    }

    /**
     * Debug: Get detailed SKU validation state (for development)
     */
    getSkuValidationDebug(skuIndex: number): string {
        const sku = this.skus.at(skuIndex);
        if (!sku) return 'SKU not found';

        const name = sku.get('name');
        const skuCode = sku.get('sku');
        const price = sku.get('price');
        const stock = sku.get('stockOnHand');

        const errors: string[] = [];
        if (name?.invalid) errors.push(`name(${name.value || 'empty'})`);
        if (skuCode?.invalid) errors.push(`sku(${skuCode.value || 'empty'})`);
        if (price?.invalid) errors.push(`price(${price.value})`);
        if (stock?.invalid) errors.push(`stock(${stock.value})`);

        return errors.length > 0 ? errors.join(', ') : 'Valid';
    }
}

