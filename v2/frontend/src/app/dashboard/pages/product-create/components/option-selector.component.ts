import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export interface OptionItem {
    id: string;
    name: string;
    suggestedSku: string;
    templateName?: string;
    isCustom?: boolean;
}

/**
 * Option Selector Component
 * Displays selectable option pills grouped by template
 */
@Component({
    selector: 'app-option-selector',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (options().length > 0) {
        <div class="mt-3 p-3 bg-base-200 rounded-lg">
            @if (templateNames()) {
            <p class="text-sm font-medium mb-3">Available {{ templateNames() }} options:</p>
            }

            <!-- Selectable pills (grouped by template) -->
            <div class="space-y-3">
                @for (templateId of selectedTemplateIds(); track templateId) {
                <div>
                    <p class="text-xs font-medium text-base-content/70 mb-1">
                        {{ getTemplateName(templateId) }}:
                    </p>
                    <div class="flex flex-wrap gap-2">
                        @for (option of options(); track option.id) {
                            @if (optionBelongsToTemplate(option, templateId)) {
                            <button
                                type="button"
                                (click)="optionToggled.emit(option.id)"
                                class="btn btn-sm"
                                [class.btn-primary]="selectedOptionIds().includes(option.id)"
                                [class.btn-outline]="!selectedOptionIds().includes(option.id)"
                            >
                                @if (selectedOptionIds().includes(option.id)) {
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                }
                                {{ option.name }}
                            </button>
                            }
                        }
                    </div>
                </div>
                }

                <!-- Custom options -->
                @if (hasCustomOptions()) {
                <div>
                    <p class="text-xs font-medium text-base-content/70 mb-1">
                        @if (selectedTemplateIds().length > 0) { Custom: } @else { Your Custom Options: }
                    </p>
                    <div class="flex flex-wrap gap-2">
                        @for (option of options(); track option.id) {
                            @if (option.isCustom) {
                            <button
                                type="button"
                                (click)="optionToggled.emit(option.id)"
                                class="btn btn-sm"
                                [class.btn-primary]="selectedOptionIds().includes(option.id)"
                                [class.btn-outline]="!selectedOptionIds().includes(option.id)"
                            >
                                @if (selectedOptionIds().includes(option.id)) {
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                }
                                {{ option.name }}
                                <span class="badge badge-xs">custom</span>
                            </button>
                            }
                        }
                    </div>
                </div>
                }
            </div>

            <p class="text-xs text-base-content/60 mt-2">👆 Click to select options for your product SKUs</p>
        </div>
        }
    `,
})
export class OptionSelectorComponent {
    // Inputs
    readonly options = input.required<OptionItem[]>();
    readonly selectedOptionIds = input.required<string[]>();
    readonly selectedTemplateIds = input.required<string[]>();
    readonly templateNames = input<string>('');
    readonly templates = input.required<any[]>();

    // Outputs
    readonly optionToggled = output<string>();

    // Computed
    readonly hasCustomOptions = computed(() => {
        return this.options().some(opt => opt.isCustom);
    });

    getTemplateName(templateId: string): string {
        return this.templates().find(t => t.id === templateId)?.name || '';
    }

    optionBelongsToTemplate(option: OptionItem, templateId: string): boolean {
        const templateName = this.getTemplateName(templateId);
        return option.templateName === templateName;
    }
}

