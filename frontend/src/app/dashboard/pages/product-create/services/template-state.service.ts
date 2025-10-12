import { Injectable, computed, signal } from '@angular/core';
import { OptionItem } from '../components/option-selector.component';

/**
 * Template definition
 */
export interface Template {
    id: string;
    name: string;
    options: Array<{ name: string; sku: string }>;
}

/**
 * Custom option definition
 */
export interface CustomOption {
    name: string;
    sku: string;
    typeName: string;
}

/**
 * Template State Service
 * 
 * Manages:
 * - Built-in template selection
 * - Custom option creation
 * - Available options computation
 * - Option ID selection
 * 
 * Single Responsibility: Template and option state management
 */
@Injectable()
export class TemplateStateService {
    // Built-in templates (immutable)
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

    // State
    private readonly selectedTemplatesSignal = signal<string[]>([]);
    private readonly customOptionsSignal = signal<CustomOption[]>([]);
    private readonly selectedOptionIdsSignal = signal<string[]>([]);

    // Public readonly signals
    readonly selectedTemplates = this.selectedTemplatesSignal.asReadonly();
    readonly customOptions = this.customOptionsSignal.asReadonly();
    readonly selectedOptionIds = this.selectedOptionIdsSignal.asReadonly();

    // Computed: All available options from templates + custom
    readonly availableOptions = computed((): OptionItem[] => {
        const templateIds = this.selectedTemplatesSignal();
        const customs = this.customOptionsSignal();

        let options: OptionItem[] = [];

        // Add options from selected templates
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
                templateName: custom.typeName,
                isCustom: true
            });
        });

        return options;
    });

    // Computed: Selected template names
    readonly selectedTemplateNames = computed(() => {
        const templateIds = this.selectedTemplatesSignal();
        const customTypeNames = [...new Set(this.customOptionsSignal().map(c => c.typeName))];

        const templateNames = templateIds
            .map(id => this.templates.find(t => t.id === id)?.name)
            .filter(Boolean);

        return [...templateNames, ...customTypeNames].join(' + ');
    });

    // Computed: All template IDs (built-in + custom types)
    readonly allTemplateIds = computed(() => {
        const builtIn = this.selectedTemplatesSignal();
        const customTypes = [...new Set(this.customOptionsSignal().map(c => c.typeName))];
        return [...builtIn, ...customTypes];
    });

    // Computed: Custom variant groups
    readonly customVariantGroups = computed(() => {
        const groups = new Set<string>();
        this.customOptionsSignal().forEach(opt => groups.add(opt.typeName));
        return Array.from(groups);
    });

    /**
     * Toggle template selection
     */
    toggleTemplate(templateId: string): void {
        const selected = [...this.selectedTemplatesSignal()];
        const index = selected.indexOf(templateId);

        if (index > -1) {
            selected.splice(index, 1);
            this.selectedTemplatesSignal.set(selected);

            // Remove associated options from selection
            const template = this.templates.find(t => t.id === templateId);
            if (template) {
                const optionIdsToRemove = template.options.map((_, idx) => `${templateId}-${idx}`);
                this.removeOptionsFromSelection(optionIdsToRemove);
            }
        } else {
            selected.push(templateId);
            this.selectedTemplatesSignal.set(selected);
        }
    }

    /**
     * Check if template is selected
     */
    isTemplateSelected(templateId: string): boolean {
        return this.selectedTemplatesSignal().includes(templateId);
    }

    /**
     * Clear all templates and selections
     */
    clearAll(): void {
        this.selectedTemplatesSignal.set([]);
        this.customOptionsSignal.set([]);
        this.selectedOptionIdsSignal.set([]);
    }

    /**
     * Toggle option selection
     */
    toggleOption(optionId: string): void {
        const selected = [...this.selectedOptionIdsSignal()];
        const index = selected.indexOf(optionId);

        if (index > -1) {
            selected.splice(index, 1);
        } else {
            selected.push(optionId);
        }

        this.selectedOptionIdsSignal.set(selected);
    }

    /**
     * Check if option is selected
     */
    isOptionSelected(optionId: string): boolean {
        return this.selectedOptionIdsSignal().includes(optionId);
    }

    /**
     * Add custom options (batch)
     */
    addCustomOptions(options: CustomOption[]): void {
        const current = this.customOptionsSignal();
        this.customOptionsSignal.set([...current, ...options]);
    }

    /**
     * Add single custom option
     */
    addCustomOption(option: CustomOption): void {
        this.addCustomOptions([option]);
    }

    /**
     * Get custom option ID for newly added option
     */
    getLastCustomOptionId(): string {
        const count = this.customOptionsSignal().length;
        return `custom-${count - 1}`;
    }

    /**
     * Auto-select newly added options
     */
    autoSelectNewOptions(startIndex: number, count: number): void {
        const newIds: string[] = [];
        for (let i = 0; i < count; i++) {
            newIds.push(`custom-${startIndex + i}`);
        }

        const selected = [...this.selectedOptionIdsSignal(), ...newIds];
        this.selectedOptionIdsSignal.set(selected);
    }

    /**
     * Remove options from selection
     */
    private removeOptionsFromSelection(optionIds: string[]): void {
        const selected = this.selectedOptionIdsSignal().filter(id => !optionIds.includes(id));
        this.selectedOptionIdsSignal.set(selected);
    }

    /**
     * Generate custom SKU from value name
     */
    generateCustomSku(valueName: string): string {
        return valueName
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 5);
    }

    /**
     * Get selected options (full objects)
     */
    getSelectedOptions(): OptionItem[] {
        const selectedIds = this.selectedOptionIdsSignal();
        return this.availableOptions().filter(opt => selectedIds.includes(opt.id));
    }
}

