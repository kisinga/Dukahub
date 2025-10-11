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
// import { CombinationModalComponent } from './components/combination-modal.component'; // Hidden - see VARIANT_MANAGEMENT.md
import { CustomOptionModalComponent } from './components/custom-option-modal.component';
import { OptionItem, OptionSelectorComponent } from './components/option-selector.component';
import { PhotoManagerComponent } from './components/photo-manager.component';
import { ProductInfoFormComponent } from './components/product-info-form.component';
import { Template } from './components/template-selector.component';
import { VariantListComponent } from './components/variant-list.component';
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
        PhotoManagerComponent,
        BarcodeScannerComponent,
        OptionSelectorComponent,
        VariantListComponent,
        CustomOptionModalComponent,
        // CombinationModalComponent, // Hidden - see VARIANT_MANAGEMENT.md
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
    readonly customOptions = signal<Array<{ name: string; sku: string; typeName: string }>>([]);

    // Selected option IDs (for generating SKU cards)
    readonly selectedOptionIds = signal<string[]>([]);

    // Modal state for adding custom option (type + multiple values)
    readonly showCustomOptionModal = signal(false);
    readonly customOptionForm = this.fb.group({
        name: ['', [Validators.required, Validators.minLength(2)]],
        values: ['', [Validators.required, Validators.minLength(3)]],
    });

    // Modal for adding single option to existing or new group
    readonly showAddOptionModal = signal(false);
    readonly addOptionForm = this.fb.group({
        variantGroup: ['Custom', [Validators.required]],
        value: ['', [Validators.required, Validators.minLength(1)]],
    });

    // Track variant groups (for organizing custom options)
    readonly customVariantGroups = computed(() => {
        const groups = new Set<string>();
        this.customOptions().forEach(opt => groups.add(opt.typeName));
        return Array.from(groups);
    });

    // Computed: Combination labels for each variant (for variant-list component)
    readonly variantCombinationLabels = computed(() => {
        const labels: string[] = [];
        for (let i = 0; i < this.variants.length; i++) {
            labels.push(this.getVariantCombinationLabel(i));
        }
        return labels;
    });

    // Computed: Custom variant indices (for variant-list component)
    readonly customVariantIndices = computed(() => {
        const indices: number[] = [];
        for (let i = 0; i < this.variants.length; i++) {
            if (this.variantHasCustomOptions(i)) {
                indices.push(i);
            }
        }
        return indices;
    });

    // --- KISS Implementation (2025-10-11) ---
    // Combination features are temporarily hidden for simplicity.
    // See VARIANT_MANAGEMENT.md for rationale and future plans.

    // Tab state for Individual vs Combinations view (UNUSED - kept for future Phase 1)
    readonly activeVariantTab = signal<'individual' | 'combinations'>('individual');

    // Modal for creating combinations (UNUSED - kept for future Phase 1)
    readonly showCombinationModal = signal(false);
    readonly combinationForm = this.fb.group({
        selectedOptionIds: [[] as string[], [Validators.required, Validators.minLength(2)]],
        name: ['', [Validators.required]],
        sku: ['', [Validators.required]],
        price: [0, [Validators.required, Validators.min(0.01)]],
        stockOnHand: [0, [Validators.required, Validators.min(0)]],
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

        console.log('🔍 Computing availableOptions...');
        console.log('🔍 selectedTemplates:', templateIds);
        console.log('🔍 customOptions:', customs);

        let options: OptionItem[] = [];

        // Add options from all selected templates
        templateIds.forEach(templateId => {
            const template = this.templates.find(t => t.id === templateId);
            console.log(`🔍 Template "${templateId}":`, template);
            if (template) {
                template.options.forEach((opt, index) => {
                    const option = {
                        id: `${templateId}-${index}`,
                        name: opt.name,
                        suggestedSku: opt.sku,
                        templateName: template.name
                    };
                    console.log(`🔍 Adding option:`, option);
                    options.push(option);
                });
            }
        });

        // Add custom options (grouped by typeName)
        customs.forEach((custom, index) => {
            options.push({
                id: `custom-${index}`,
                name: custom.name,
                suggestedSku: custom.sku,
                templateName: custom.typeName,
                isCustom: true
            });
        });

        return options;
    });

    // Get selected template names (including custom types)
    readonly selectedTemplateNames = computed(() => {
        const templateIds = this.selectedTemplates();
        const customTypeNames = [...new Set(this.customOptions().map(c => c.typeName))];

        const templateNames = templateIds
            .map(id => this.templates.find(t => t.id === id)?.name)
            .filter(Boolean);

        return [...templateNames, ...customTypeNames].join(' + ');
    });

    // Get all active template IDs (built-in + custom)
    readonly allTemplateIds = computed(() => {
        const builtIn = this.selectedTemplates();
        const customTypes = [...new Set(this.customOptions().map(c => c.typeName))];
        const result = [...builtIn, ...customTypes];
        console.log('🔍 allTemplateIds:', result);
        return result;
    });

    // Individual variants (have exactly 1 option)
    readonly individualVariants = computed(() => {
        return this.variants.controls.filter(v => {
            const optionIds = v.get('optionIds')?.value || [];
            return optionIds.length === 1;
        }) as FormGroup[];
    });

    // Combined variants (have 2+ options)
    readonly combinedVariants = computed(() => {
        return this.variants.controls.filter(v => {
            const optionIds = v.get('optionIds')?.value || [];
            return optionIds.length > 1;
        }) as FormGroup[];
    });

    // Group individual variants by template
    readonly groupedIndividualVariants = computed(() => {
        const individuals = this.individualVariants();
        const grouped = new Map<string, FormGroup[]>();

        individuals.forEach(variant => {
            const optionIds = variant.get('optionIds')?.value || [];
            if (optionIds.length === 1) {
                const optionId = optionIds[0];
                const option = this.availableOptions().find(opt => opt.id === optionId);
                const templateName = option?.templateName || 'Custom';

                if (!grouped.has(templateName)) {
                    grouped.set(templateName, []);
                }
                grouped.get(templateName)!.push(variant);
            }
        });

        return grouped;
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

        return isValid && notSubmitting && hasVariants && hasLocations;
    });

    // Computed: Validation issues count
    readonly validationIssues = computed(() => {
        const issues: string[] = [];
        const activeForm = this.itemType() === 'product' ? this.productForm : this.serviceForm;

        // Check form validity
        if (activeForm.get('name')?.invalid) issues.push('Name required');
        if (activeForm.get('price')?.invalid) issues.push('Price required');

        // Product-specific
        if (this.itemType() === 'product') {
            if (this.variants.length === 0) issues.push('Add at least 1 SKU');

            // Check variant validity
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
     * Regenerate individual variants based on selected options
     * Each option becomes its own variant (no Cartesian product)
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

        // Remove individual variants that are no longer selected
        const existingIndividualVariants = this.variants.controls.filter(v => {
            const optionIds = v.get('optionIds')?.value || [];
            return optionIds.length === 1;
        });

        // Keep only variants whose option is still selected
        for (let i = this.variants.length - 1; i >= 0; i--) {
            const variant = this.variants.at(i);
            const optionIds = variant.get('optionIds')?.value || [];

            if (optionIds.length === 1 && !selectedIds.includes(optionIds[0])) {
                this.variants.removeAt(i);
            }
        }

        // Create individual variants for newly selected options
        selectedOptions.forEach(option => {
            // Check if variant already exists
            const exists = this.variants.controls.some(v => {
                const optionIds = v.get('optionIds')?.value || [];
                return optionIds.length === 1 && optionIds[0] === option.id;
            });

            if (!exists) {
                // Create new individual variant
                const name = this.skuGenerator.formatOptionName(option.name);
                const sku = this.skuGenerator.generateVariantSku(productPrefix, [option]);

                const variant: VariantForm = {
                    optionIds: [option.id],
                    name,
                    sku,
                    price: 0,
                    stockOnHand: 0
                };

                this.variants.push(this.createVariantForm(variant));
            }
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

        // Scroll to SKU Details section after adding
        setTimeout(() => {
            const skuSection = document.querySelector('[formArrayName="variants"]');
            if (skuSection) {
                skuSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 100);
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
     * Open modal to add custom option (type + multiple values)
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
     * Open modal to add single option value
     */
    openAddOptionValueModal(): void {
        this.addOptionForm.reset();
        this.showAddOptionModal.set(true);
    }

    /**
     * Close add option value modal
     */
    closeAddOptionModal(): void {
        this.showAddOptionModal.set(false);
        this.addOptionForm.reset();
    }

    /**
     * Add single option value to a variant group
     */
    addOptionValue(): void {
        if (this.addOptionForm.invalid) {
            this.addOptionForm.markAllAsTouched();
            return;
        }

        const valueName = this.addOptionForm.value.value!.trim();
        const groupName = this.addOptionForm.value.variantGroup!.trim();
        const customs = this.customOptions();
        const startIndex = customs.length;

        // Create option under selected group
        const newOption = {
            name: valueName,
            sku: this.generateCustomSku(valueName),
            typeName: groupName
        };

        this.customOptions.set([...customs, newOption]);
        this.closeAddOptionModal();

        // Auto-select the new option
        setTimeout(() => {
            const newOptionId = `custom-${startIndex}`;
            if (!this.isOptionSelected(newOptionId)) {
                this.toggleOptionSelection(newOptionId);
            }

            // Scroll to SKU Details
            setTimeout(() => {
                const skuSection = document.querySelector('[formArrayName="variants"]');
                if (skuSection) {
                    skuSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 200);
        }, 100);
    }

    /**
     * Add custom option and auto-select all values
     */
    addCustomOption(): void {
        if (this.customOptionForm.invalid) {
            this.customOptionForm.markAllAsTouched();
            return;
        }

        const value = this.customOptionForm.value;
        const optionTypeName = value.name!.trim();
        const valuesText = value.values!.trim();

        // Parse multiple values (one per line)
        const values = valuesText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (values.length === 0) {
            return;
        }

        const customs = this.customOptions();
        const startIndex = customs.length;

        // Create custom options for each value
        const newOptions = values.map((valueName, idx) => ({
            name: valueName,
            sku: this.generateCustomSku(valueName),
            typeName: optionTypeName
        }));

        this.customOptions.set([...customs, ...newOptions]);

        // Close modal
        this.closeCustomOptionModal();

        // Auto-select all newly created options
        setTimeout(() => {
            newOptions.forEach((_, idx) => {
                const newOptionId = `custom-${startIndex + idx}`;
                if (!this.isOptionSelected(newOptionId)) {
                    this.toggleOptionSelection(newOptionId);
                }
            });

            // Scroll to SKU Details section
            setTimeout(() => {
                const skuSection = document.querySelector('[formArrayName="variants"]');
                if (skuSection) {
                    skuSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 200);
        }, 100);
    }

    /**
     * Generate SKU code from value name
     */
    private generateCustomSku(valueName: string): string {
        return valueName
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 5);
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
     * Check if variant has any custom options
     */
    variantHasCustomOptions(variantIndex: number): boolean {
        const variant = this.variants.at(variantIndex);
        const optionIds = variant.get('optionIds')?.value || [];

        return optionIds.some((id: string) => id.startsWith('custom-'));
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
     * Open combination creation modal
     */
    openCombinationModal(): void {
        this.combinationForm.reset({
            selectedOptionIds: [],
            name: '',
            sku: '',
            price: 0,
            stockOnHand: 0
        });
        this.showCombinationModal.set(true);
    }

    /**
     * Close combination modal
     */
    closeCombinationModal(): void {
        this.showCombinationModal.set(false);
        this.combinationForm.reset();
    }

    /**
     * Toggle option selection in combination modal
     */
    toggleCombinationOption(optionId: string): void {
        const selectedIds = this.combinationForm.get('selectedOptionIds')?.value || [];
        const index = selectedIds.indexOf(optionId);

        if (index > -1) {
            selectedIds.splice(index, 1);
        } else {
            selectedIds.push(optionId);
        }

        this.combinationForm.patchValue({ selectedOptionIds: [...selectedIds] });

        // Auto-generate name and SKU based on selected options
        if (selectedIds.length >= 2) {
            const options = this.availableOptions().filter(opt => selectedIds.includes(opt.id));
            const names = options.map(opt => this.skuGenerator.formatOptionName(opt.name));
            const productPrefix = this.skuGenerator.generateProductPrefix(
                this.productForm.get('name')?.value || ''
            );
            const sku = this.skuGenerator.generateVariantSku(productPrefix, options);

            this.combinationForm.patchValue({
                name: names.join(' - '),
                sku
            });
        }
    }

    /**
     * Check if option is selected in combination form
     */
    isCombinationOptionSelected(optionId: string): boolean {
        const selectedIds = this.combinationForm.get('selectedOptionIds')?.value || [];
        return selectedIds.includes(optionId);
    }

    /**
     * Create combination variant
     */
    createCombination(): void {
        if (this.combinationForm.invalid) {
            this.combinationForm.markAllAsTouched();
            return;
        }

        const value = this.combinationForm.value;

        const combinationVariant: VariantForm = {
            optionIds: value.selectedOptionIds!,
            name: value.name!.trim(),
            sku: value.sku!.trim(),
            price: Number(value.price),
            stockOnHand: Number(value.stockOnHand)
        };

        this.variants.push(this.createVariantForm(combinationVariant));
        this.closeCombinationModal();

        // Switch to combinations tab to show the new combination
        this.activeVariantTab.set('combinations');

        // Scroll to combinations section
        setTimeout(() => {
            const combinationsSection = document.querySelector('[data-section="combinations"]');
            if (combinationsSection) {
                combinationsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 100);
    }

    /**
     * Get variant index in main array by finding it in the form array
     */
    getVariantIndex(variant: FormGroup): number {
        return this.variants.controls.indexOf(variant);
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

