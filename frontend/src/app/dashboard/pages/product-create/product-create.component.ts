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
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CompanyService } from '../../../core/services/company.service';
import { ProductService } from '../../../core/services/product.service';
import { StockLocationService } from '../../../core/services/stock-location.service';
import { IdentificationSelectorComponent } from './components/identification-selector.component';
import { ItemTypeSelectorComponent } from './components/item-type-selector.component';
import { LocationDisplayComponent } from './components/location-display.component';
import { MeasurementUnitSelectorComponent } from './components/measurement-unit-selector.component';
import { ProductNameInputComponent } from './components/product-name-input.component';
import { ProductTypeSelectorComponent } from './components/product-type-selector.component';
import { ServiceSkuEditorComponent } from './components/service-sku-editor.component';
import { SkuListEditorComponent } from './components/sku-list-editor.component';
import { SubmitBarComponent } from './components/submit-bar.component';
import { ValidationIssuesPanelComponent } from './components/validation-issues-panel.component';
import { VariantDimensionEditorComponent } from './components/variant-dimension-editor.component';
import { ItemType, ProductType, VariantDimension } from './types/product-creation.types';

/**
 * Product Creation Component - MEASURED vs DISCRETE Model
 * 
 * ARCHITECTURE: Simple, modular, mobile-first
 * 
 * FLOW:
 * 1. Choose item type: Product or Service
 * 2. For products: Choose MEASURED (fractional) or DISCRETE (whole units)
 * 3. Configure variants and generate SKUs automatically
 * 4. Set prices and stock for each SKU
 * 
 * DESIGN PRINCIPLES:
 * - Each component handles ONE concern
 * - No over-engineering - build only what's needed
 * - Mobile-first with progressive disclosure
 * - Clear visual feedback for fractional vs discrete
 */
@Component({
    selector: 'app-product-create',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ItemTypeSelectorComponent,
        ProductTypeSelectorComponent,
        ProductNameInputComponent,
        IdentificationSelectorComponent,
        MeasurementUnitSelectorComponent,
        VariantDimensionEditorComponent,
        SkuListEditorComponent,
        LocationDisplayComponent,
        ServiceSkuEditorComponent,
        ValidationIssuesPanelComponent,
        SubmitBarComponent,
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

    // View references (for photo upload in submit)
    readonly identificationSelector = viewChild<IdentificationSelectorComponent>('identificationSelector');

    // Edit mode
    readonly isEditMode = signal(false);
    readonly productId = signal<string | null>(null);

    // New model: Item type and product type
    readonly itemType = signal<ItemType>('product');
    readonly productType = signal<ProductType | null>(null);
    readonly measurementUnit = signal<string | null>(null);
    readonly variantDimensions = signal<VariantDimension[]>([]);

    // Form: Product + Multiple SKUs
    readonly productForm: FormGroup;

    // Unique suffix for this form session (to ensure SKU uniqueness)
    private readonly skuUniqueSuffix = Date.now().toString().slice(-6);

    // Computed: SKUs FormArray
    get skus(): FormArray {
        return this.productForm.get('skus') as FormArray;
    }

    // Getters for form controls
    get nameControl(): FormControl {
        return this.productForm.get('name') as FormControl;
    }

    get barcodeControl(): FormControl {
        return this.productForm.get('barcode') as FormControl;
    }

    get firstSkuFormGroup(): FormGroup {
        return this.skus.at(0) as FormGroup;
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
            issues.push(`Barcode OR 5+ label photos`);
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

                // All products require stock validation
                return (
                    (name?.invalid) ||
                    (skuCode?.invalid) ||
                    (price?.invalid) ||
                    (stock?.invalid)
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
     */
    private createSkuFormGroup(
        skuCode: string = '',
        name: string = '',
        price: number = 1,
        stock: number = 0,
        allowFractionalQuantity: boolean = false,
        wholesalePrice: number = 0
    ): FormGroup {
        return this.fb.group({
            name: [name, [Validators.required, Validators.minLength(1)]],
            sku: [skuCode, [Validators.required, Validators.minLength(1), Validators.maxLength(50)]],
            price: [price, [Validators.required, Validators.min(1)]],
            stockOnHand: [stock, [Validators.required, Validators.min(0)]],
            allowFractionalQuantity: [allowFractionalQuantity],
            wholesalePrice: [wholesalePrice, [Validators.min(0)]],
        });
    }

    // ============================================================================
    // NEW MODEL METHODS
    // ============================================================================

    /**
     * Set item type (product or service)
     */
    setItemType(type: ItemType): void {
        this.itemType.set(type);
        if (type === 'service') {
            this.productType.set(null);
            this.measurementUnit.set(null);
            this.variantDimensions.set([]);
            this.generateSkus();
        }
    }

    /**
     * Set product type (measured or discrete)
     */
    setProductType(type: ProductType): void {
        this.productType.set(type);
        this.generateSkus();
    }

    /**
     * Set measurement unit for measured products
     */
    setMeasurementUnit(unit: string): void {
        this.measurementUnit.set(unit);
        this.generateSkus();
    }

    /**
     * Add a new variant dimension
     */
    addVariantDimension(): void {
        const newDimension: VariantDimension = {
            id: Date.now().toString(),
            name: '',
            options: []
        };
        this.variantDimensions.update(dims => [...dims, newDimension]);
    }

    /**
     * Remove a variant dimension
     */
    removeVariantDimension(id: string): void {
        this.variantDimensions.update(dims => dims.filter(dim => dim.id !== id));
        this.generateSkus();
    }

    /**
     * Update dimension options from array or comma-separated string
     */
    updateDimensionOptions(id: string, options: string[] | string): void {
        const optionsArray = Array.isArray(options)
            ? options
            : options.split(',').map(opt => opt.trim()).filter(opt => opt);
        this.variantDimensions.update(dims =>
            dims.map(dim => dim.id === id ? { ...dim, options: optionsArray } : dim)
        );
        this.generateSkus();
    }

    /**
     * Generate SKUs based on current configuration
     */
    generateSkus(): void {
        this.skus.clear();

        if (this.itemType() === 'service') {
            this.generateServiceSkus();
        } else if (this.productType() === 'measured') {
            this.generateMeasuredSkus();
        } else if (this.productType() === 'discrete') {
            this.generateDiscreteSkus();
        }

        // Trigger validation update
        this.skuValidityTrigger.update(v => v + 1);
    }

    /**
     * Generate SKUs for services (single SKU)
     */
    private generateServiceSkus(): void {
        const productName = this.productForm.get('name')?.value || 'Service';
        const skuCode = this.generateSku(productName);
        const skuGroup = this.createSkuFormGroup(skuCode, productName, 1, 0, false, 0);
        this.skus.push(skuGroup);
    }

    /**
     * Generate SKUs for measured products
     */
    private generateMeasuredSkus(): void {
        const unit = this.measurementUnit() || 'UNIT';
        const dimensions = this.variantDimensions();

        if (dimensions.length === 0) {
            // Pure measured: just the unit
            const skuCode = this.generateSku(unit);
            this.skus.push(this.createSkuFormGroup(skuCode, unit, 1, 0, true, 0));
        } else {
            // Measured with variants: "Grade A - KG", "Grade B - KG"
            dimensions[0].options.forEach(option => {
                const name = `${option} - ${unit}`;
                const skuCode = this.generateSku(name);
                this.skus.push(this.createSkuFormGroup(skuCode, name, 1, 0, true, 0));
            });
        }
    }

    /**
     * Generate SKUs for discrete products
     */
    private generateDiscreteSkus(): void {
        const dimensions = this.variantDimensions();

        if (dimensions.length === 0) {
            // Single discrete SKU
            const name = this.productForm.get('name')?.value || 'Product';
            const skuCode = this.generateSku(name);
            this.skus.push(this.createSkuFormGroup(skuCode, name, 1, 0, false, 0));
        } else if (dimensions.length === 1) {
            // Single dimension: "Red", "Blue", "Yellow"
            dimensions[0].options.forEach(option => {
                const skuCode = this.generateSku(option);
                this.skus.push(this.createSkuFormGroup(skuCode, option, 1, 0, false, 0));
            });
        } else {
            // Multiple dimensions: Cartesian product
            this.generateCartesianProduct(dimensions).forEach(combination => {
                const name = combination.join(' - ');
                const skuCode = this.generateSku(name);
                this.skus.push(this.createSkuFormGroup(skuCode, name, 1, 0, false, 0));
            });
        }
    }

    /**
     * Generate all combinations from multiple dimensions
     */
    private generateCartesianProduct(dimensions: VariantDimension[]): string[][] {
        return dimensions.reduce((acc, dim) => {
            if (acc.length === 0) return dim.options.map(opt => [opt]);
            return acc.flatMap(combo => dim.options.map(opt => [...combo, opt]));
        }, [] as string[][]);
    }

    /**
     * Add a new SKU to the list (manual override)
     */
    addSku(): void {
        const productName = this.productForm.get('name')?.value || '';
        const index = this.skus.length + 1;

        // Auto-generate SKU code
        const skuCode = productName
            ? `${this.generateSku(productName)}-${index}`
            : `SKU-${index}`;

        // Create SKU with pre-filled code to avoid validation issues
        const skuGroup = this.createSkuFormGroup(skuCode, '', 0, 0, false, 0);
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
     * Handle label photos uploaded
     */
    onPhotosChanged(photos: File[]): void {
        this.photoCount.set(photos.length);
        if (photos.length >= 5) {
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
                        variant.stockOnHand || 0,
                        variant.customFields?.allowFractionalQuantity || false,
                        variant.customFields?.wholesalePrice || 0
                    );
                    this.skus.push(skuGroup);
                });
            }
        } catch (error: any) {
            console.error('Failed to load product:', error);
            this.submitError.set('Failed to load product data');
        }
    }

    // Removed toggleItemType - now always products only

    /**
     * Update validators for all SKU forms based on current item type
     */
    private updateSkuValidators(): void {

        this.skus.controls.forEach(skuGroup => {
            const stockControl = skuGroup.get('stockOnHand');
            if (stockControl) {
                // All products require stock validation
                stockControl.setValidators([Validators.required, Validators.min(0)]);
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

            // Location is required for products
            const stockLocationId = this.defaultLocation()?.id;

            if (!stockLocationId) {
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
            // All variants are products with tracked inventory
            console.log('🔍 Form data before processing:', formValue);
            console.log('🔍 SKUs from form:', formValue.skus);

            const variantInputs = formValue.skus.map((sku: any, index: number) => {
                console.log(`🔍 Processing SKU ${index + 1}:`, sku);

                // Append unique suffix to SKU to prevent duplicates
                // Format: USER_SKU-TIMESTAMP-INDEX
                const uniqueSku = `${sku.sku.trim().toUpperCase()}-${this.skuUniqueSuffix}-${index + 1}`;

                return {
                    sku: uniqueSku,
                    name: sku.name.trim(),
                    price: Number(sku.price),
                    trackInventory: true, // Products: track stock
                    stockOnHand: Number(sku.stockOnHand),
                    stockLocationId: stockLocationId!,
                    customFields: {
                        wholesalePrice: sku.wholesalePrice ? Number(sku.wholesalePrice) * 100 : null, // Convert to cents
                        allowFractionalQuantity: Boolean(sku.allowFractionalQuantity),
                    },
                };
            });

            console.log('🔍 Final variant inputs:', variantInputs);

            const productId = await this.productService.createProductWithVariants(
                productInput,
                variantInputs
            );

            if (productId) {
                console.log('✅ Transaction Phase 1 COMPLETE: Product & Variants created');

                // Upload photos if any were added (Phase 2 - non-blocking)
                const identificationSelector = this.identificationSelector();
                if (identificationSelector) {
                    const photoManager = identificationSelector.photoManager();
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
                } else {
                    this.submitSuccess.set(true);
                }

                // Navigate after a delay to show success/warning message
                setTimeout(() => {
                    this.router.navigate(['/dashboard/products']);
                }, 1500);
            } else {
                const error = this.productService.error();
                this.submitError.set(error || `Failed to create product`);
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

