import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { OptionItem } from './option-selector.component';

/**
 * Combination Modal Component
 * 
 * Modal for creating product variant combinations by selecting 2+ options
 * from any templates (same or different) and entering SKU details.
 */
@Component({
    selector: 'app-combination-modal',
    imports: [CommonModule, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (isOpen()) {
        <dialog open class="modal modal-bottom sm:modal-middle">
            <div class="modal-box max-w-2xl max-h-[90vh] overflow-y-auto">
                <h3 class="font-bold text-lg mb-2">➕ Create Combination</h3>
                <p class="text-sm opacity-70 mb-4">
                    Select any 2+ options to combine
                    <span class="text-xs opacity-60 block mt-1">
                        e.g., Red + Small, or Kilograms + Liters, or Red + Blue
                    </span>
                </p>

                <form [formGroup]="form()" (ngSubmit)="submitted.emit()">
                    <div class="space-y-4">
                        <!-- Selected Count Badge -->
                        <div class="flex items-center justify-between">
                            <p class="text-sm font-semibold">Select Options</p>
                            <span class="badge badge-primary">
                                {{ form().get('selectedOptionIds')?.value?.length || 0 }} selected
                            </span>
                        </div>

                        <!-- Option Selection -->
                        <div class="bg-base-200 p-4 rounded-lg space-y-4">
                            @for (templateId of templateIds(); track templateId) {
                            <div>
                                <div class="flex items-center justify-between mb-2">
                                    <p class="text-xs font-semibold opacity-70">{{ getTemplateName(templateId) }}</p>
                                    @if (getSelectedCountForTemplate(templateId) > 0) {
                                    <span class="badge badge-xs badge-primary">
                                        {{ getSelectedCountForTemplate(templateId) }}
                                    </span>
                                    }
                                </div>
                                <div class="grid grid-cols-2 gap-2">
                                    @for (option of getOptionsForTemplate(templateId); track option.id) {
                                    <label class="cursor-pointer">
                                        <input
                                            type="checkbox"
                                            [checked]="isOptionSelected(option.id)"
                                            (change)="optionToggled.emit(option.id)"
                                            class="hidden"
                                        />
                                        <div
                                            class="btn min-h-[3rem] w-full"
                                            [class.btn-primary]="isOptionSelected(option.id)"
                                            [class.btn-outline]="!isOptionSelected(option.id)"
                                        >
                                            {{ option.name }}
                                        </div>
                                    </label>
                                    }
                                </div>
                            </div>
                            }
                        </div>

                        <!-- Preview -->
                        @if (form().get('selectedOptionIds')?.value?.length >= 2) {
                        <div class="alert alert-info">
                            <span class="font-semibold">Preview:</span>
                            <span>{{ form().get('name')?.value }}</span>
                        </div>
                        }

                        <!-- SKU Details Form (only show when 2+ options selected) -->
                        @if (form().get('selectedOptionIds')?.value?.length >= 2) {
                        <div class="bg-primary/5 p-4 rounded-lg space-y-3">
                            <p class="text-sm font-semibold mb-2">SKU Details</p>

                            <!-- Name -->
                            <div>
                                <label class="text-xs font-semibold opacity-70 mb-1 block">🏷️ Name</label>
                                <input
                                    type="text"
                                    formControlName="name"
                                    placeholder="e.g., Red - Small"
                                    class="input input-sm input-bordered w-full"
                                    [class.input-error]="
                                        form().get('name')?.invalid && form().get('name')?.touched
                                    "
                                />
                                @if (form().get('name')?.invalid && form().get('name')?.touched) {
                                <p class="text-error text-xs mt-0.5">Required</p>
                                }
                            </div>

                            <!-- SKU Code -->
                            <div>
                                <label class="text-xs font-semibold opacity-70 mb-1 block">🔖 SKU</label>
                                <input
                                    type="text"
                                    formControlName="sku"
                                    placeholder="e.g., PROD-RED-SM"
                                    class="input input-sm input-bordered w-full"
                                    [class.input-error]="
                                        form().get('sku')?.invalid && form().get('sku')?.touched
                                    "
                                    maxlength="50"
                                />
                                @if (form().get('sku')?.invalid && form().get('sku')?.touched) {
                                <p class="text-error text-xs mt-0.5">Required</p>
                                }
                            </div>

                            <!-- Price & Stock -->
                            <div class="grid grid-cols-2 gap-2">
                                <!-- Price -->
                                <div>
                                    <label class="text-xs font-semibold opacity-70 mb-1 block">💵 Price</label>
                                    <input
                                        type="number"
                                        formControlName="price"
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        class="input input-sm input-bordered w-full"
                                        [class.input-error]="
                                            form().get('price')?.invalid && form().get('price')?.touched
                                        "
                                    />
                                </div>

                                <!-- Stock -->
                                <div>
                                    <label class="text-xs font-semibold opacity-70 mb-1 block">📦 Stock</label>
                                    <input
                                        type="number"
                                        formControlName="stockOnHand"
                                        placeholder="0"
                                        min="0"
                                        class="input input-sm input-bordered w-full"
                                    />
                                </div>
                            </div>
                        </div>
                        }

                        <!-- Validation message -->
                        @if (form().get('selectedOptionIds')?.value?.length < 2) {
                        <div class="alert alert-warning">
                            <span>⚠️ Select at least 2 options to create a combination</span>
                        </div>
                        }
                    </div>

                    <div class="modal-action">
                        <button type="button" (click)="cancelled.emit()" class="btn">Cancel</button>
                        <button
                            type="submit"
                            class="btn btn-primary min-h-[3rem]"
                            [disabled]="form().invalid"
                        >
                            ✓ Create Combination
                        </button>
                    </div>
                </form>
            </div>
            <form method="dialog" class="modal-backdrop" (click)="cancelled.emit()">
                <button>close</button>
            </form>
        </dialog>
        }
    `,
})
export class CombinationModalComponent {
    readonly isOpen = input.required<boolean>();
    readonly form = input.required<FormGroup>();
    readonly options = input.required<OptionItem[]>();
    readonly templateIds = input.required<string[]>();
    readonly selectedOptionIds = input.required<string[]>();

    readonly submitted = output<void>();
    readonly cancelled = output<void>();
    readonly optionToggled = output<string>();

    /**
     * Get template name by ID
     */
    getTemplateName(templateId: string): string {
        const option = this.options().find(opt => opt.templateName === templateId);
        return option?.templateName || templateId;
    }

    /**
     * Get options for a specific template
     */
    getOptionsForTemplate(templateId: string): OptionItem[] {
        return this.options().filter(opt => opt.templateName === templateId);
    }

    /**
     * Check if option is selected
     */
    isOptionSelected(optionId: string): boolean {
        return this.selectedOptionIds().includes(optionId);
    }

    /**
     * Get count of selected options for a specific template
     */
    getSelectedCountForTemplate(templateId: string): number {
        const templateOptions = this.getOptionsForTemplate(templateId);
        return templateOptions.filter(opt => this.isOptionSelected(opt.id)).length;
    }
}

