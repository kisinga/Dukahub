import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
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
import { CompanyService } from '../../../core/services/company.service';
import { ProductService } from '../../../core/services/product.service';
import { StockLocationService } from '../../../core/services/stock-location.service';
import { BarcodeScannerComponent } from './components/barcode-scanner.component';
import { CustomOptionModalComponent } from './components/custom-option-modal.component';
import { OptionSelectorComponent } from './components/option-selector.component';
import { PhotoManagerComponent } from './components/photo-manager.component';
import { ProductInfoFormComponent } from './components/product-info-form.component';
import { TemplatePickerComponent } from './components/template-picker.component';
import { VariantDetailsSectionComponent } from './components/variant-details-section.component';
import { ProductFormOrchestratorService } from './services/product-form-orchestrator.service';
import { TemplateStateService } from './services/template-state.service';
import { VariantFormStateService } from './services/variant-form-state.service';
import { VariantForm } from './services/variant-generator.service';

/**
 * Product Creation Component (Refactored)
 * 
 * Orchestrates product/service creation by delegating to focused child components.
 * Follows KISS principle - keeps only orchestration and submission logic.
 */
@Component({
    selector: 'app-product-create',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ProductInfoFormComponent,
        PhotoManagerComponent,
        BarcodeScannerComponent,
        OptionSelectorComponent,
        TemplatePickerComponent,
        VariantDetailsSectionComponent,
        CustomOptionModalComponent,
    ],
    providers: [
        TemplateStateService,
        VariantFormStateService,
        ProductFormOrchestratorService,
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

    // Orchestrator coordinates all state
    readonly orchestrator = inject(ProductFormOrchestratorService);

    // View references to child components
    readonly photoManager = viewChild<PhotoManagerComponent>('photoManager');
    readonly barcodeScanner = viewChild<BarcodeScannerComponent>('barcodeScanner');

    // Forms
    readonly productForm: FormGroup;
    readonly serviceForm: FormGroup;

    // Submission state
    readonly isSubmitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly submitSuccess = signal(false);

    // Stock locations
    readonly stockLocations = this.stockLocationService.locations;
    readonly isLoadingLocations = this.stockLocationService.isLoading;
    readonly locationsError = this.stockLocationService.error;

    // Delegated state from orchestrator
    readonly itemType = this.orchestrator.itemType;
    readonly templateState = this.orchestrator.templateState;
    readonly variantFormState = this.orchestrator.variantFormState;

    // Computed: Combination labels for variants
    readonly variantCombinationLabels = computed(() => {
        return this.variantFormState.getAllCombinationLabels(
            this.templateState.availableOptions()
        );
    });

    // Computed: Custom variant indices
    readonly customVariantIndices = computed(() => {
        return this.variantFormState.getCustomVariantIndices();
    });

    // Signal to track form validity
    readonly formValidSignal = signal(false);

    // Computed: Can submit form
    readonly canSubmit = computed(() => {
        const isValid = this.formValidSignal();
        const notSubmitting = !this.isSubmitting();

        if (this.itemType() === 'service') {
            return isValid && notSubmitting;
        }

        // Products need variants and locations
        const hasVariants = this.variants.length > 0;
        const hasLocations = this.stockLocations().length > 0;

        return isValid && notSubmitting && hasVariants && hasLocations;
    });

    // Computed: Validation issues
    readonly validationIssues = computed(() => {
        const issues: string[] = [];
        const activeForm = this.itemType() === 'product' ? this.productForm : this.serviceForm;

        if (activeForm.get('name')?.invalid) issues.push('Name required');
        if (this.itemType() === 'service' && activeForm.get('price')?.invalid) {
            issues.push('Price required');
        }

        if (this.itemType() === 'product') {
            if (this.variants.length === 0) issues.push('Add at least 1 SKU');

            this.variants.controls.forEach((v, i) => {
                if (v.get('name')?.invalid) issues.push(`SKU ${i + 1}: Name`);
                if (v.get('sku')?.invalid) issues.push(`SKU ${i + 1}: Code`);
                if (v.get('price')?.invalid) issues.push(`SKU ${i + 1}: Price`);
            });
        }

        return issues;
    });

    constructor() {
        // Initialize product form
        this.productForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(3)]],
            description: [''],
            stockLocationId: ['', [Validators.required]],
            variants: this.fb.array([]),
        });

        // Initialize service form
        this.serviceForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(3)]],
            description: ['', [Validators.required, Validators.minLength(10)]],
            price: [0, [Validators.required, Validators.min(0.01)]],
            duration: [0, [Validators.min(0)]],
        });

        // Initialize variant form state with product form's variants array
        this.variantFormState.initialize(this.variants);

        // Track form validity changes
        this.productForm.statusChanges.subscribe((status) => {
            if (this.itemType() === 'product') {
                this.formValidSignal.set(status === 'VALID');
            }
        });

        this.serviceForm.statusChanges.subscribe((status) => {
            if (this.itemType() === 'service') {
                this.formValidSignal.set(status === 'VALID');
            }
        });

        this.formValidSignal.set(this.productForm.valid);

        // Sync product name changes to orchestrator (for SKU generation)
        effect(() => {
            const name = this.productForm.get('name')?.value || '';
            this.orchestrator.setProductName(name);
        });

        // Auto-select first stock location when loaded
        effect(() => {
            const locations = this.stockLocationService.locations();
            if (locations.length > 0 && !this.productForm.get('stockLocationId')?.value) {
                this.productForm.patchValue({ stockLocationId: locations[0].id });
            }
        });
    }

    ngOnInit(): void {
        this.stockLocationService.fetchStockLocations();
    }


    /**
     * Get variants form array
     */
    get variants(): FormArray {
        return this.productForm.get('variants') as FormArray;
    }

    /**
     * Remove a variant
     */
    removeVariant(variantIndex: number): void {
        this.variantFormState.removeVariant(variantIndex);
    }

    /**
     * Switch between product and service creation
     */
    switchItemType(type: 'product' | 'service'): void {
        this.orchestrator.switchItemType(type);

        // Update form validity signal based on active form
        if (type === 'product') {
            this.formValidSignal.set(this.productForm.valid);
        } else {
            this.formValidSignal.set(this.serviceForm.valid);
        }
    }

    /**
     * Submit the form (delegates to product or service submission)
     */
    async onSubmit(): Promise<void> {
        if (this.itemType() === 'service') {
            return this.submitService();
        }
        return this.submitProduct();
    }

    /**
     * Submit service form
     */
    async submitService(): Promise<void> {
        if (!this.canSubmit()) {
            this.serviceForm.markAllAsTouched();
            return;
        }

        this.isSubmitting.set(true);
        this.submitError.set(null);
        this.submitSuccess.set(false);

        try {
            const formValue = this.serviceForm.value;

            // Create a simple product variant for the service
            // Services are treated as products with a single variant and no stock tracking
            const productInput = {
                name: formValue.name.trim(),
                description: formValue.description?.trim() || '',
                enabled: true,
            };

            // Ensure we have at least one stock location
            const locations = this.stockLocations();
            if (locations.length === 0) {
                this.submitError.set('No stock location available. Please create one in settings first.');
                this.isSubmitting.set(false);
                return;
            }

            const variantsInput = [{
                sku: `SVC-${Date.now()}`, // Auto-generate simple SKU for service
                name: 'Standard', // Default variant name for services
                price: Number(formValue.price),
                stockOnHand: 0, // Services don't track stock
                stockLocationId: locations[0].id, // Use first location
            }];

            const productId = await this.productService.createProductWithVariants(
                productInput,
                variantsInput
            );

            if (productId) {
                this.submitSuccess.set(true);
                setTimeout(() => {
                    this.router.navigate(['/dashboard/products']);
                }, 1500);
            } else {
                const error = this.productService.error();
                this.submitError.set(error || 'Failed to create service');
            }
        } catch (error: any) {
            console.error('❌ Service creation failed:', error);
            this.submitError.set(error.message || 'An unexpected error occurred');
        } finally {
            this.isSubmitting.set(false);
        }
    }

    /**
     * Submit product form with variants
     * For now: Creates simple variants without option groups (KISS)
     */
    async submitProduct(): Promise<void> {
        if (!this.canSubmit()) {
            this.productForm.markAllAsTouched();
            return;
        }

        this.isSubmitting.set(true);
        this.submitError.set(null);
        this.submitSuccess.set(false);

        try {
            const formValue = this.productForm.value;
            const stockLocationId = formValue.stockLocationId;

            const productInput = {
                name: formValue.name.trim(),
                description: formValue.description?.trim() || '',
                enabled: true,
            };

            // Map variants (KISS: independent variants, no ProductOptions yet)
            // Note: optionIds in our form are UI identifiers only, not Vendure IDs
            // For KISS mode, we create simple independent variants
            const variantsInput = formValue.variants.map((v: VariantForm) => ({
                sku: v.sku.trim().toUpperCase(),
                name: v.name.trim(),
                price: Number(v.price),
                stockOnHand: Number(v.stockOnHand),
                stockLocationId,
                // optionIds intentionally omitted - creates independent variants in Vendure
            }));

            console.log('📦 Submitting variants:', variantsInput);
            console.log('📦 Variants count:', variantsInput.length);

            const productId = await this.productService.createProductWithVariants(
                productInput,
                variantsInput
            );

            if (productId) {
                this.submitSuccess.set(true);
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
     * Handle barcode scanned from child component
     * Updates the current variant's SKU field
     */
    onBarcodeScanned(barcode: string, variantIndex: number): void {
        const control = this.variants.at(variantIndex);
        if (control) {
            control.patchValue({ sku: barcode });
        }
    }

    /**
     * Start barcode scanner for a specific variant
     * Delegates to BarcodeScannerComponent
     */
    async startBarcodeScanner(variantIndex: number): Promise<void> {
        const scanner = this.barcodeScanner();
        if (scanner) {
            await scanner.startScanning();
            // Note: The scanned barcode will be handled via the barcodeScanned output
            // which should be connected in the template
        }
    }

    /**
     * Cancel and go back to products list
     */
    cancel(): void {
        if (confirm('Are you sure? All unsaved changes will be lost.')) {
            this.router.navigate(['/dashboard/products']);
        }
    }
}

