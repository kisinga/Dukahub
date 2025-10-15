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
import { Router } from '@angular/router';
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
    private readonly productService = inject(ProductService);
    private readonly stockLocationService = inject(StockLocationService);
    readonly companyService = inject(CompanyService);

    // View references
    readonly photoManager = viewChild<PhotoManagerComponent>('photoManager');
    readonly barcodeScanner = viewChild<BarcodeScannerComponent>('barcodeScanner');

    // Item type toggle (product vs service)
    readonly itemType = signal<'product' | 'service'>('product');

    // Form: Product + Multiple SKUs
    readonly productForm: FormGroup;

    // Computed: SKUs FormArray
    get skus(): FormArray {
        return this.productForm.get('skus') as FormArray;
    }

    // Submission state
    readonly isSubmitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly submitSuccess = signal(false);

    // Active location (from navbar context)
    readonly activeLocation = this.stockLocationService.activeLocation;
    readonly activeLocationId = this.stockLocationService.activeLocationId;

    // Identification method chosen
    readonly identificationMethod = signal<'barcode' | 'label-photos' | null>(null);
    readonly photoCount = signal(0);

    // Computed: Has valid identification
    readonly hasValidIdentification = computed(() => {
        const method = this.identificationMethod();
        if (method === 'barcode') {
            return !!this.productForm.get('barcode')?.value?.trim();
        }
        if (method === 'label-photos') {
            return this.photoCount() >= 5;
        }
        return false;
    });

    // Computed: Form validity
    readonly canSubmit = computed(() => {
        const isValid = this.productForm.valid;
        const notSubmitting = !this.isSubmitting();
        const hasLocation = !!this.activeLocationId();
        const hasIdentification = this.hasValidIdentification();
        return isValid && notSubmitting && hasLocation && hasIdentification;
    });

    // Computed: Validation issues
    readonly validationIssues = computed(() => {
        const issues: string[] = [];
        const type = this.itemType();

        if (!this.hasValidIdentification()) {
            const photoType = type === 'service' ? 'card' : 'label';
            issues.push(`Barcode OR 5+ ${photoType} photos`);
        }
        if (this.productForm.get('name')?.invalid) issues.push('Product name required');

        // SKU validation
        if (this.skus.length === 0) {
            issues.push('At least 1 SKU required');
        } else {
            // Check for invalid SKUs
            const invalidSkus = this.skus.controls.filter(sku => sku.invalid).length;
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

        if (type === 'product' && !this.activeLocationId()) {
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

    ngOnInit(): void {
        // Stock locations are loaded on boot via AppInitService
        // Just check if active location is set
        if (!this.activeLocationId()) {
            this.submitError.set('No active location selected. Please select a location from the navbar.');
        }

        // Add first SKU by default
        this.addSku();
    }

    /**
     * Create a new SKU FormGroup
     */
    private createSkuFormGroup(name: string = '', price: number = 0, stock: number = 0): FormGroup {
        return this.fb.group({
            name: [name, [Validators.required, Validators.minLength(1)]],
            sku: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]],
            price: [price, [Validators.required, Validators.min(0.01)]],
            stockOnHand: [stock, [Validators.required, Validators.min(0)]],
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

        const skuGroup = this.createSkuFormGroup();
        skuGroup.patchValue({ sku: skuCode });

        this.skus.push(skuGroup);
    }

    /**
     * Remove SKU at index
     */
    removeSku(index: number): void {
        if (this.skus.length > 1) {
            this.skus.removeAt(index);
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
        if (method !== 'barcode') this.productForm.patchValue({ barcode: '' });
        if (method !== 'label-photos') this.photoCount.set(0);
    }

    /**
     * Handle barcode scanned
     */
    onBarcodeScanned(barcode: string): void {
        this.productForm.patchValue({ barcode });
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
     * Toggle between product and service
     */
    toggleItemType(type: 'product' | 'service'): void {
        this.itemType.set(type);
        this.submitError.set(null);
    }

    /**
     * Submit form - creates product/service with multiple SKUs
     */
    async onSubmit(): Promise<void> {
        if (!this.canSubmit()) {
            this.productForm.markAllAsTouched();
            this.skus.markAllAsTouched();
            return;
        }

        this.isSubmitting.set(true);
        this.submitError.set(null);
        this.submitSuccess.set(false);

        try {
            const formValue = this.productForm.value;
            const type = this.itemType();

            // For products, location is required. For services, optional (no stock tracking)
            const stockLocationId = type === 'product' ? this.activeLocationId() : undefined;

            if (type === 'product' && !stockLocationId) {
                this.submitError.set('No active location. Please select a location from the navbar.');
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
            const variantInputs = formValue.skus.map((sku: any) => {
                if (type === 'service') {
                    return {
                        sku: sku.sku.trim().toUpperCase(),
                        name: sku.name.trim(),
                        price: Number(sku.price),
                        trackInventory: false, // Services: infinite stock
                        stockOnHand: 0,
                        stockLocationId: stockLocationId || '',
                    };
                } else {
                    return {
                        sku: sku.sku.trim().toUpperCase(),
                        name: sku.name.trim(),
                        price: Number(sku.price),
                        trackInventory: true, // Products: track stock
                        stockOnHand: Number(sku.stockOnHand),
                        stockLocationId: stockLocationId!,
                    };
                }
            });

            console.log(`📦 Creating ${type} with ${variantInputs.length} SKU(s):`, {
                product: productInput,
                variants: variantInputs,
            });

            const productId = await this.productService.createProductWithVariants(
                productInput,
                variantInputs
            );

            if (productId) {
                this.submitSuccess.set(true);
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
     * Cancel and go back
     */
    cancel(): void {
        if (confirm('Discard this product?')) {
            this.router.navigate(['/dashboard/products']);
        }
    }
}

