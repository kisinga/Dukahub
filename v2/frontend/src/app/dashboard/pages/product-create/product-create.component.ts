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
import { CustomOptionModalComponent } from './components/custom-option-modal.component';
import { OptionItem, OptionSelectorComponent } from './components/option-selector.component';
import { Template, TemplateSelectorComponent } from './components/template-selector.component';
import { VariantCardComponent } from './components/variant-card.component';

/**
 * Variant form structure
 * Note: name is auto-generated from optionId (shown to user but not editable)
 */
interface VariantForm {
    optionIds: string[]; // Array of option IDs (for combinations)
    name: string; // Customizable variant name
    sku: string;
    price: number;
    stockOnHand: number;
    // Note: Photos are product-level, not variant-level
    // Future: Add toggle for SKU-specific photos when needed
}

/**
 * Product Creation Component
 * 
 * Simple product creation with multiple SKUs/variants.
 * Mobile-first design for fast inventory management.
 */
@Component({
    selector: 'app-product-create',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TemplateSelectorComponent,
        OptionSelectorComponent,
        VariantCardComponent,
        CustomOptionModalComponent,
    ],
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
        const hasVariants = this.variants.length > 0;
        const hasLocations = this.stockLocations().length > 0;

        console.log('🔘 Button state:', { isValid, notSubmitting, hasVariants, hasLocations });

        return isValid && notSubmitting && hasVariants && hasLocations;
    });

    constructor() {
        // Initialize form
        this.productForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(3)]],
            description: [''], // Optional
            stockLocationId: ['', [Validators.required]],
            variants: this.fb.array([]),
        });

        // Variants are added dynamically when options are selected

        // Track form validity changes for reactive button state
        this.productForm.statusChanges.subscribe((status) => {
            const isValid = status === 'VALID';
            this.formValidSignal.set(isValid);
        });
        this.formValidSignal.set(this.productForm.valid);

        // Auto-select first stock location when loaded
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
     * Creates Cartesian product of options grouped by template
     */
    private regenerateVariants(): void {
        const selectedIds = this.selectedOptionIds();

        if (selectedIds.length === 0) {
            this.variants.clear();
            return;
        }

        // Group selected options by template
        const optionsByTemplate: Map<string, any[]> = new Map();

        selectedIds.forEach(optionId => {
            const option = this.availableOptions().find(opt => opt.id === optionId);
            if (option) {
                const templateName = option.templateName || 'Custom';
                if (!optionsByTemplate.has(templateName)) {
                    optionsByTemplate.set(templateName, []);
                }
                optionsByTemplate.get(templateName)!.push(option);
            }
        });

        // Get all template groups as arrays
        const groups = Array.from(optionsByTemplate.values());

        // Generate Cartesian product (all combinations)
        const combinations = this.cartesianProduct(groups);

        // Clear existing variants
        this.variants.clear();

        // Create variant for each combination with product prefix
        const productPrefix = this.getProductSkuPrefix();

        combinations.forEach(combo => {
            const optionIds = combo.map((opt: any) => opt.id);
            const names = combo.map((opt: any) => this.formatOptionName(opt.name));
            const skus = combo.map((opt: any) => opt.suggestedSku).filter(Boolean);

            // Generate unique SKU: PRODUCT-OPTION1-OPTION2
            const combinedSku = skus.length > 0 ? skus.join('-') : 'VAR';
            const uniqueSku = `${productPrefix}-${combinedSku}`;

            this.variants.push(this.createVariantForm({
                optionIds,
                name: names.join(' - '),
                sku: uniqueSku,
                price: 0,
                stockOnHand: 0
            }));
        });
    }

    /**
     * Generate Cartesian product of arrays
     */
    private cartesianProduct(arrays: any[][]): any[][] {
        if (arrays.length === 0) return [[]];
        if (arrays.length === 1) return arrays[0].map(item => [item]);

        const [first, ...rest] = arrays;
        const restProduct = this.cartesianProduct(rest);

        const result: any[][] = [];
        first.forEach(item => {
            restProduct.forEach(combo => {
                result.push([item, ...combo]);
            });
        });

        return result;
    }

    /**
     * Check if option is selected
     */
    isOptionSelected(optionId: string): boolean {
        return this.selectedOptionIds().includes(optionId);
    }

    /**
     * Format option name nicely
     */
    private formatOptionName(name: string): string {
        if (name === 'Kilograms') return 'One Kilogram';
        if (name === 'Grams') return 'One Gram';
        if (name === 'Tons') return 'One Ton';
        if (name === 'Pounds') return 'One Pound';
        if (name === 'Milliliters') return 'One Milliliter';
        if (name === 'Liters') return 'One Liter';
        if (name === 'Gallons') return 'One Gallon';
        return name;
    }

    /**
     * Get product SKU prefix from product name
     * Ensures SKUs are globally unique across all products
     */
    private getProductSkuPrefix(): string {
        const name = this.productForm.get('name')?.value || '';
        if (!name.trim()) return 'PROD';

        // Take first 4 characters, remove spaces, uppercase
        return name
            .trim()
            .substring(0, 4)
            .toUpperCase()
            .replace(/\s/g, '')
            .replace(/[^A-Z0-9]/g, ''); // Remove special chars
    }

    /**
     * Add a fully custom variant (no template/option)
     */
    addCustomVariant(): void {
        const productPrefix = this.getProductSkuPrefix();
        const variantCount = this.getCustomVariants().length + 1;

        this.variants.push(this.createVariantForm({
            optionIds: [],
            name: '',
            sku: `${productPrefix}-CUSTOM${variantCount}`,
            price: 0,
            stockOnHand: 0
        }));
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
     */
    getVariantCombinationLabel(variantIndex: number): string {
        const variant = this.variants.at(variantIndex);
        const optionIds = variant.get('optionIds')?.value || [];

        if (optionIds.length === 0) return 'Custom';

        const options = this.availableOptions();
        const names = optionIds.map((id: string) => {
            const opt = options.find(o => o.id === id);
            return opt?.name || '';
        }).filter(Boolean);

        return names.join(' × ') || 'Unknown';
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
     * For now: Creates simple variants without option groups (KISS)
     */
    async onSubmit(): Promise<void> {
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
     * Handle photo selection for product
     * Note: Photos are product-level for AI recognition
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
     * Remove a photo from product
     */
    removePhoto(photoIndex: number): void {
        const photos = this.photos();
        const previews = this.photoPreviews();

        photos.splice(photoIndex, 1);
        previews.splice(photoIndex, 1);

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

