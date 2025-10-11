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
import { OptionItem, OptionSelectorComponent } from './components/option-selector.component';
import { PhotoManagerComponent } from './components/photo-manager.component';
import { ProductInfoFormComponent } from './components/product-info-form.component';
import { ServiceFormComponent } from './components/service-form.component';
import { Template, TemplateSelectorComponent } from './components/template-selector.component';
import { VariantCardComponent } from './components/variant-card.component';
import { SkuGeneratorService } from './services/sku-generator.service';
import { VariantForm, VariantGeneratorService } from './services/variant-generator.service';

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
        ServiceFormComponent,
        PhotoManagerComponent,
        BarcodeScannerComponent,
        TemplateSelectorComponent,
        OptionSelectorComponent,
        VariantCardComponent,
        CustomOptionModalComponent,
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
    private readonly variantGenerator = inject(VariantGeneratorService);
    private readonly skuGenerator = inject(SkuGeneratorService);
    readonly companyService = inject(CompanyService);

    // View references to child components
    readonly photoManager = viewChild<PhotoManagerComponent>('photoManager');
    readonly barcodeScanner = viewChild<BarcodeScannerComponent>('barcodeScanner');

    // Forms
    readonly productForm: FormGroup;
    readonly serviceForm: FormGroup;

    // State signals
    readonly isSubmitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly submitSuccess = signal(false);
    readonly itemType = signal<'product' | 'service'>('product');

    // Stock locations
    readonly stockLocations = this.stockLocationService.locations;
    readonly isLoadingLocations = this.stockLocationService.isLoading;
    readonly locationsError = this.stockLocationService.error;

    // Template-based option groups (can select multiple)
    readonly selectedTemplates = signal<string[]>([]);

    // Custom options added by user (in addition to template options)
    readonly customOptions = signal<Array<{ name: string; sku: string }>>([]);

    // Selected option IDs (for generating SKU cards)
    readonly selectedOptionIds = signal<string[]>([]);

    // Modal state for adding custom option
    readonly showCustomOptionModal = signal(false);
    readonly customOptionForm = this.fb.group({
        name: ['', [Validators.required, Validators.minLength(1)]],
        sku: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(10)]],
    });

    // Built-in templates for quick setup
    readonly templates: Template[] = [
        {
            id: 'weight',
            name: 'Weight',
            options: [
                { name: 'Kilograms', sku: 'KG' },
                { name: 'Grams', sku: 'G' },
                { name: 'Tons', sku: 'TON' },
                { name: 'Pounds', sku: 'LB' }
            ]
        },
        {
            id: 'size',
            name: 'Size',
            options: [
                { name: 'XS', sku: 'XS' },
                { name: 'Small', sku: 'SM' },
                { name: 'Medium', sku: 'MD' },
                { name: 'Large', sku: 'LG' },
                { name: 'XL', sku: 'XL' },
                { name: 'XXL', sku: 'XXL' }
            ]
        },
        {
            id: 'color',
            name: 'Color',
            options: [
                { name: 'Red', sku: 'RED' },
                { name: 'Blue', sku: 'BLU' },
                { name: 'Green', sku: 'GRN' },
                { name: 'Black', sku: 'BLK' },
                { name: 'White', sku: 'WHT' },
                { name: 'Yellow', sku: 'YEL' }
            ]
        },
        {
            id: 'volume',
            name: 'Volume',
            options: [
                { name: 'Milliliters', sku: 'ML' },
                { name: 'Liters', sku: 'L' },
                { name: 'Gallons', sku: 'GAL' }
            ]
        },
        {
            id: 'packaging',
            name: 'Packaging',
            options: [
                { name: 'Single', sku: 'SINGLE' },
                { name: 'Pack of 6', sku: 'PK6' },
                { name: 'Pack of 12', sku: 'PK12' },
                { name: 'Carton (24)', sku: 'CTN24' },
                { name: 'Bulk (100)', sku: 'BULK100' }
            ]
        },
    ];

    // Available options from all selected templates + custom options
    readonly availableOptions = computed((): OptionItem[] => {
        const templateIds = this.selectedTemplates();
        const customs = this.customOptions();

        let options: OptionItem[] = [];

        // Add options from all selected templates
        templateIds.forEach(templateId => {
            const template = this.templates.find(t => t.id === templateId);
            if (template) {
                template.options.forEach((opt, index) => {
                    options.push({
                        id: `${templateId}-${index}`,
                        name: opt.name,
                        suggestedSku: opt.sku,
                        templateName: template.name
                    });
                });
            }
        });

        // Add custom options
        customs.forEach((custom, index) => {
            options.push({
                id: `custom-${index}`,
                name: custom.name,
                suggestedSku: custom.sku,
                isCustom: true
            });
        });

        return options;
    });

    // Get selected template names
    readonly selectedTemplateNames = computed(() => {
        const templateIds = this.selectedTemplates();
        return templateIds
            .map(id => this.templates.find(t => t.id === id)?.name)
            .filter(Boolean)
            .join(' + ');
    });

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

        if (this.itemType() === 'service') {
            // Services only need valid form
            return isValid && notSubmitting;
        }

        // Products need variants and locations
        const hasVariants = this.variants.length > 0;
        const hasLocations = this.stockLocations().length > 0;

        console.log('🔘 Button state:', { isValid, notSubmitting, hasVariants, hasLocations });

        return isValid && notSubmitting && hasVariants && hasLocations;
    });

    constructor() {
        // Initialize product form
        this.productForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(3)]],
            description: [''], // Optional
            stockLocationId: ['', [Validators.required]],
            variants: this.fb.array([]),
        });

        // Initialize service form (simpler - no inventory, no variants)
        this.serviceForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(3)]],
            description: ['', [Validators.required, Validators.minLength(10)]],
            price: [0, [Validators.required, Validators.min(0.01)]],
            duration: [0, [Validators.min(0)]], // Optional: duration in minutes
        });

        // Track form validity changes for reactive button state
        this.productForm.statusChanges.subscribe((status) => {
            const isValid = status === 'VALID';
            if (this.itemType() === 'product') {
                this.formValidSignal.set(isValid);
            }
        });

        this.serviceForm.statusChanges.subscribe((status) => {
            const isValid = status === 'VALID';
            if (this.itemType() === 'service') {
                this.formValidSignal.set(isValid);
            }
        });

        this.formValidSignal.set(this.productForm.valid);

        // Auto-select first stock location when loaded (products only)
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

    /**
     * Toggle template selection (can select multiple)
     */
    toggleTemplate(templateId: string): void {
        const selected = this.selectedTemplates();
        const index = selected.indexOf(templateId);

        if (index > -1) {
            // Remove template
            selected.splice(index, 1);
            this.selectedTemplates.set([...selected]);

            // Remove variants associated with options from this template
            const template = this.templates.find(t => t.id === templateId);
            if (template) {
                const optionIdsToRemove = template.options.map((_, idx) => `${templateId}-${idx}`);
                optionIdsToRemove.forEach(optionId => {
                    if (this.isOptionSelected(optionId)) {
                        this.toggleOptionSelection(optionId);
                    }
                });
            }
        } else {
            // Add template
            selected.push(templateId);
            this.selectedTemplates.set([...selected]);
        }
    }

    /**
     * Check if template is selected
     */
    isTemplateSelected(templateId: string): boolean {
        return this.selectedTemplates().includes(templateId);
    }

    /**
     * Clear all templates
     */
    clearTemplates(): void {
        this.selectedTemplates.set([]);
        this.variants.clear();
        this.selectedOptionIds.set([]);
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
            optionIds: [defaults?.optionIds || [], [Validators.required, Validators.minLength(1)]],
            name: [defaults?.name || '', [Validators.required, Validators.minLength(1)]],
            sku: [
                defaults?.sku || '',
                [
                    Validators.required,
                    Validators.minLength(1),
                    Validators.maxLength(50),
                ],
            ],
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
     * Toggle option selection - regenerates all variant combinations
     */
    toggleOptionSelection(optionId: string): void {
        const selectedIds = this.selectedOptionIds();
        const index = selectedIds.indexOf(optionId);

        if (index > -1) {
            // Remove option
            selectedIds.splice(index, 1);
        } else {
            // Add option
            selectedIds.push(optionId);
        }

        this.selectedOptionIds.set([...selectedIds]);

        // Regenerate all variants based on combinations
        this.regenerateVariants();
    }

    /**
     * Regenerate all variants based on selected options
     * Delegates to VariantGeneratorService
     */
    private regenerateVariants(): void {
        const selectedIds = this.selectedOptionIds();

        if (selectedIds.length === 0) {
            this.variants.clear();
            return;
        }

        // Get selected options from available options
        const selectedOptions = this.availableOptions().filter(opt =>
            selectedIds.includes(opt.id)
        );

        // Get product SKU prefix
        const productPrefix = this.skuGenerator.generateProductPrefix(
            this.productForm.get('name')?.value || ''
        );

        // Generate variants using service
        const generatedVariants = this.variantGenerator.generateVariants(
            selectedOptions,
            productPrefix
        );

        // Clear existing variants
        this.variants.clear();

        // Add generated variants to FormArray
        generatedVariants.forEach(variant => {
            this.variants.push(this.createVariantForm(variant));
        });
    }

    /**
     * Check if option is selected
     */
    isOptionSelected(optionId: string): boolean {
        return this.selectedOptionIds().includes(optionId);
    }

    /**
     * Add a fully custom variant (no template/option)
     */
    addCustomVariant(): void {
        const productPrefix = this.skuGenerator.generateProductPrefix(
            this.productForm.get('name')?.value || ''
        );
        const variantCount = this.getCustomVariants().length + 1;

        const customVariant = this.variantGenerator.createCustomVariant(
            productPrefix,
            variantCount
        );

        this.variants.push(this.createVariantForm(customVariant));
    }

    /**
     * Remove a variant
     */
    removeVariant(variantIndex: number): void {
        this.variants.removeAt(variantIndex);
    }

    /**
     * Get custom variants (no optionIds or empty)
     */
    getCustomVariants(): FormGroup[] {
        return this.variants.controls.filter(
            v => {
                const ids = v.get('optionIds')?.value || [];
                return ids.length === 0;
            }
        ) as FormGroup[];
    }

    /**
     * Get generated combo variants (has optionIds)
     */
    getComboVariants(): FormGroup[] {
        return this.variants.controls.filter(
            v => {
                const ids = v.get('optionIds')?.value || [];
                return ids.length > 0;
            }
        ) as FormGroup[];
    }

    /**
     * Open modal to add custom option
     */
    openCustomOptionModal(): void {
        this.customOptionForm.reset();
        this.showCustomOptionModal.set(true);
    }

    /**
     * Close custom option modal
     */
    closeCustomOptionModal(): void {
        this.showCustomOptionModal.set(false);
        this.customOptionForm.reset();
    }

    /**
     * Add custom option and auto-select it
     */
    addCustomOption(): void {
        if (this.customOptionForm.invalid) {
            this.customOptionForm.markAllAsTouched();
            return;
        }

        const value = this.customOptionForm.value;
        const customs = this.customOptions();

        // Add to custom options
        const newIndex = customs.length;
        this.customOptions.set([
            ...customs,
            {
                name: value.name!.trim(),
                sku: value.sku!.trim().toUpperCase()
            }
        ]);

        // Close modal
        this.closeCustomOptionModal();

        // Auto-select the newly created option to create first SKU
        setTimeout(() => {
            const newOptionId = `custom-${newIndex}`;
            this.toggleOptionSelection(newOptionId);
        }, 100);
    }

    /**
     * Get combination label for a variant
     * Delegates to VariantGeneratorService
     */
    getVariantCombinationLabel(variantIndex: number): string {
        const variant = this.variants.at(variantIndex);
        const optionIds = variant.get('optionIds')?.value || [];

        return this.variantGenerator.getVariantCombinationLabel(
            optionIds,
            this.availableOptions()
        );
    }

    /**
     * Get option name by option ID
     */
    getOptionName(optionId: string): string {
        const option = this.availableOptions().find(opt => opt.id === optionId);
        return option?.name || 'Unknown';
    }

    /**
     * Get template name by template ID
     */
    getTemplateName(templateId: string): string {
        return this.templates.find(t => t.id === templateId)?.name || '';
    }

    /**
     * Check if option belongs to template
     */
    optionBelongsToTemplate(option: any, templateId: string): boolean {
        const templateName = this.getTemplateName(templateId);
        return option.templateName === templateName;
    }


    /**
     * Switch between product and service creation
     */
    switchItemType(type: 'product' | 'service'): void {
        this.itemType.set(type);

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

            // Map variants
            const variantsInput = formValue.variants.map((v: VariantForm) => ({
                sku: v.sku.trim().toUpperCase(),
                name: v.name.trim(),
                price: Number(v.price),
                stockOnHand: Number(v.stockOnHand),
                stockLocationId,
            }));

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

