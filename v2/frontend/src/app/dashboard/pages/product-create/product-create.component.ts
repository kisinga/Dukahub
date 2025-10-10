import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
    computed,
    effect,
    inject,
    signal,
    viewChild,
} from '@angular/core';
import {
    FormArray,
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { BarcodeScannerService } from '../../../core/services/barcode-scanner.service';
import { CameraService } from '../../../core/services/camera.service';
import { CompanyService } from '../../../core/services/company.service';
import { ProductService } from '../../../core/services/product.service';
import {
    StockLocationService
} from '../../../core/services/stock-location.service';

/**
 * Variant form structure
 */
interface VariantForm {
    sku: string;
    name: string;
    price: number;
    stockOnHand: number;
}

/**
 * Product Creation Component
 * 
 * FEATURES:
 * - Create products with multiple SKUs/variants
 * - Channel-aware (automatically uses active channel)
 * - Stock location selection
 * - Real-time SKU validation
 * - Dynamic variant form array
 * 
 * UX FLOW:
 * 1. Fill product details (name, description)
 * 2. Select stock location where inventory will be stored
 * 3. Add one or more SKUs with prices and initial stock
 * 4. Submit to create product and all variants
 * 5. Redirect to products list on success
 */
@Component({
    selector: 'app-product-create',
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './product-create.component.html',
    styleUrl: './product-create.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCreateComponent implements OnInit, OnDestroy {
    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);
    private readonly productService = inject(ProductService);
    private readonly stockLocationService = inject(StockLocationService);
    private readonly cameraService = inject(CameraService);
    private readonly barcodeService = inject(BarcodeScannerService);
    readonly companyService = inject(CompanyService);

    // View references
    readonly barcodeVideoElement = viewChild<ElementRef<HTMLVideoElement>>('barcodeCamera');

    // Form
    readonly productForm: FormGroup;

    // State signals
    readonly isSubmitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly submitSuccess = signal(false);
    readonly photos = signal<File[]>([]);
    readonly photoPreviews = signal<string[]>([]);
    readonly activeTab = signal<'photos' | 'barcode'>('photos');
    readonly isScanningBarcode = signal(false);
    readonly scannedBarcode = signal<string | null>(null);
    private currentVariantIndexForBarcode = 0;

    // Stock locations
    readonly stockLocations = this.stockLocationService.locations;
    readonly isLoadingLocations = this.stockLocationService.isLoading;
    readonly locationsError = this.stockLocationService.error;

    // Active channel info
    readonly activeChannel = this.companyService.activeCompany;
    readonly channelName = computed(() => {
        const channel = this.activeChannel();
        return channel?.code || 'Unknown Channel';
    });

    // Signal to track form validity (updated on value changes)
    readonly formValidSignal = signal(false);

    // Computed: Can submit form
    readonly canSubmit = computed(() => {
        const isValid = this.formValidSignal();
        const notSubmitting = !this.isSubmitting();
        const hasVariants = this.variants.length > 0;
        const hasLocations = this.stockLocations().length > 0;

        console.log('🔘 Button state:', { isValid, notSubmitting, hasVariants, hasLocations });

        return isValid && notSubmitting && hasVariants && hasLocations;
    });

    constructor() {
        // Initialize form
        this.productForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(3)]],
            description: ['', [Validators.required, Validators.minLength(10)]],
            enabled: [true],
            stockLocationId: ['', [Validators.required]],
            variants: this.fb.array([]),
        });

        // Add initial variant
        this.addVariant();

        // Track form validity changes for reactive button state
        this.productForm.statusChanges.subscribe((status) => {
            const isValid = status === 'VALID';
            console.log('📝 Form status changed:', status, 'valid:', isValid);
            this.formValidSignal.set(isValid);
            console.log('🔘 Form value:', this.productForm.value);
        });
        this.formValidSignal.set(this.productForm.valid);

        // Auto-select first stock location when loaded using effect
        // Must be in constructor (injection context), not ngOnInit
        effect(() => {
            const locations = this.stockLocationService.locations();
            if (locations.length > 0 && !this.productForm.get('stockLocationId')?.value) {
                this.productForm.patchValue({ stockLocationId: locations[0].id });
            }
        });
    }

    ngOnInit(): void {
        // Fetch stock locations
        this.stockLocationService.fetchStockLocations();
    }

    ngOnDestroy(): void {
        this.stopBarcodeScanner();
    }

    /**
     * Get variants form array
     */
    get variants(): FormArray {
        return this.productForm.get('variants') as FormArray;
    }

    /**
     * Create a new variant form group
     */
    private createVariantForm(defaults?: Partial<VariantForm>): FormGroup {
        return this.fb.group({
            sku: [
                defaults?.sku || '',
                [
                    Validators.required,
                    Validators.minLength(3),
                    Validators.maxLength(50),
                ],
            ],
            name: [defaults?.name || '', [Validators.required, Validators.minLength(2)]],
            price: [
                defaults?.price || 0,
                [Validators.required, Validators.min(0.01)],
            ],
            stockOnHand: [
                defaults?.stockOnHand || 0,
                [Validators.required, Validators.min(0)],
            ],
        });
    }

    /**
     * Add a new variant to the form
     */
    addVariant(): void {
        // Pre-fill name with product name if this is the first variant
        const productName = this.productForm.get('name')?.value || '';
        const isFirstVariant = this.variants.length === 0;

        const defaults: Partial<VariantForm> = isFirstVariant && productName
            ? { name: productName }
            : {};

        this.variants.push(this.createVariantForm(defaults));
    }

    /**
     * Remove a variant from the form
     */
    removeVariant(index: number): void {
        // Prevent removing the last variant
        if (this.variants.length > 1) {
            this.variants.removeAt(index);
        }
    }

    /**
     * Auto-fill all variant names with product name
     * Useful shortcut for simple products with one variant
     */
    autoFillVariantNames(): void {
        const productName = this.productForm.get('name')?.value || '';
        if (!productName) return;

        this.variants.controls.forEach((control) => {
            if (!control.get('name')?.value) {
                control.patchValue({ name: productName });
            }
        });
    }

    /**
     * Generate SKU suggestion based on product name and variant index
     */
    suggestSKU(variantIndex: number): void {
        const productName = this.productForm.get('name')?.value || '';
        if (!productName) return;

        // Generate SKU: First 3 letters + timestamp + variant number
        const prefix = productName
            .replace(/[^a-zA-Z0-9]/g, '')
            .toUpperCase()
            .substring(0, 3)
            .padEnd(3, 'X');
        const timestamp = Date.now().toString().slice(-6);
        const variant = String(variantIndex + 1).padStart(2, '0');
        const suggestedSKU = `${prefix}${timestamp}${variant}`;

        const control = this.variants.at(variantIndex);
        control.patchValue({ sku: suggestedSKU });
    }

    /**
     * Submit the form and create product with variants
     */
    async onSubmit(): Promise<void> {
        if (!this.canSubmit()) {
            // Mark all fields as touched to show validation errors
            this.productForm.markAllAsTouched();
            return;
        }

        this.isSubmitting.set(true);
        this.submitError.set(null);
        this.submitSuccess.set(false);

        try {
            const formValue = this.productForm.value;
            const stockLocationId = formValue.stockLocationId;

            // Prepare product input
            const productInput = {
                name: formValue.name.trim(),
                description: formValue.description.trim(),
                enabled: formValue.enabled,
            };

            // Prepare variants input (add stock location to each)
            const variantsInput = formValue.variants.map((v: VariantForm) => ({
                sku: v.sku.trim().toUpperCase(),
                name: v.name.trim(),
                price: Number(v.price),
                stockOnHand: Number(v.stockOnHand),
                stockLocationId,
            }));

            // Create product with variants
            const productId = await this.productService.createProductWithVariants(
                productInput,
                variantsInput
            );

            if (productId) {
                this.submitSuccess.set(true);
                console.log('✅ Product created successfully:', productId);

                // Redirect to products list after a short delay
                setTimeout(() => {
                    this.router.navigate(['/dashboard/products']);
                }, 1500);
            } else {
                const error = this.productService.error();
                this.submitError.set(error || 'Failed to create product');
            }
        } catch (error: any) {
            console.error('❌ Product creation failed:', error);
            this.submitError.set(error.message || 'An unexpected error occurred');
        } finally {
            this.isSubmitting.set(false);
        }
    }

    /**
     * Switch between Photos and Barcode tabs
     */
    switchTab(tab: 'photos' | 'barcode'): void {
        this.activeTab.set(tab);
        if (tab === 'barcode') {
            // Stop any existing scanner when switching away
            this.stopBarcodeScanner();
        }
    }

    /**
     * Start barcode scanner for a specific variant
     */
    async startBarcodeScanner(variantIndex: number): Promise<void> {
        this.currentVariantIndexForBarcode = variantIndex;
        const videoEl = this.barcodeVideoElement()?.nativeElement;

        if (!videoEl) {
            console.error('Video element not found');
            return;
        }

        try {
            // Start camera
            const started = await this.cameraService.startCamera(videoEl);
            if (!started) {
                console.error('Failed to start camera');
                return;
            }

            this.isScanningBarcode.set(true);

            // Start barcode scanning
            if (this.barcodeService.isSupported()) {
                await this.barcodeService.initialize();
                this.barcodeService.startScanning(
                    videoEl,
                    (result) => {
                        // Barcode detected - fill in SKU field
                        const control = this.variants.at(variantIndex);
                        if (control) {
                            control.patchValue({ sku: result.rawValue });
                            this.scannedBarcode.set(result.rawValue);
                        }
                        this.stopBarcodeScanner();
                    },
                    500
                );
            }
        } catch (error) {
            console.error('Failed to start barcode scanner:', error);
        }
    }

    /**
     * Stop barcode scanner
     */
    stopBarcodeScanner(): void {
        this.barcodeService.stopScanning();
        const videoEl = this.barcodeVideoElement()?.nativeElement;
        if (videoEl) {
            this.cameraService.stopCamera(videoEl);
        }
        this.isScanningBarcode.set(false);
    }

    /**
     * Handle photo selection from file input or camera
     */
    onPhotosSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const newFiles = Array.from(input.files);
        const currentPhotos = this.photos();

        // Add new photos
        const allPhotos = [...currentPhotos, ...newFiles];
        this.photos.set(allPhotos);

        // Generate previews for new photos
        const currentPreviews = this.photoPreviews();
        newFiles.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = e.target?.result as string;
                this.photoPreviews.set([...this.photoPreviews(), preview]);
            };
            reader.readAsDataURL(file);
        });

        // Clear input
        input.value = '';
    }

    /**
     * Remove a photo by index
     */
    removePhoto(index: number): void {
        const photos = this.photos();
        const previews = this.photoPreviews();

        photos.splice(index, 1);
        previews.splice(index, 1);

        this.photos.set([...photos]);
        this.photoPreviews.set([...previews]);
    }

    /**
     * Cancel and go back to products list
     */
    cancel(): void {
        if (confirm('Are you sure? All unsaved changes will be lost.')) {
            this.router.navigate(['/dashboard/products']);
        }
    }

    /**
     * Helper: Check if a form control has an error
     */
    hasError(controlName: string, errorType?: string): boolean {
        const control = this.productForm.get(controlName);
        if (!control) return false;

        if (errorType) {
            return control.hasError(errorType) && (control.dirty || control.touched);
        }
        return control.invalid && (control.dirty || control.touched);
    }

    /**
     * Helper: Check if a variant control has an error
     */
    hasVariantError(
        variantIndex: number,
        controlName: string,
        errorType?: string
    ): boolean {
        const control = this.variants.at(variantIndex)?.get(controlName);
        if (!control) return false;

        if (errorType) {
            return control.hasError(errorType) && (control.dirty || control.touched);
        }
        return control.invalid && (control.dirty || control.touched);
    }

    /**
     * Get error message for a form control
     */
    getErrorMessage(controlName: string): string {
        const control = this.productForm.get(controlName);
        if (!control || !control.errors) return '';

        const errors = control.errors;
        if (errors['required']) return 'This field is required';
        if (errors['minlength']) {
            return `Minimum ${errors['minlength'].requiredLength} characters required`;
        }
        if (errors['min']) return `Minimum value is ${errors['min'].min}`;
        if (errors['pattern']) {
            if (controlName === 'sku') {
                return 'SKU must contain only letters, numbers, hyphens, and underscores';
            }
            return 'Invalid format';
        }

        return 'Invalid value';
    }

    /**
     * Get error message for a variant control
     */
    getVariantErrorMessage(variantIndex: number, controlName: string): string {
        const control = this.variants.at(variantIndex)?.get(controlName);
        if (!control || !control.errors) return '';

        const errors = control.errors;
        if (errors['required']) return 'Required';
        if (errors['minlength']) {
            return `Min ${errors['minlength'].requiredLength} chars`;
        }
        if (errors['maxlength']) {
            return `Max ${errors['maxlength'].requiredLength} chars`;
        }
        if (errors['min']) return `Min ${errors['min'].min}`;

        return 'Invalid';
    }
}

