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
        <div class="space-y-3">
            @for (templateId of selectedTemplateIds(); track templateId) {
            <div>
                <p class="text-sm font-semibold mb-2" [class.text-accent]="isCustomTemplate(templateId)">
                    {{ getTemplateName(templateId) || templateId }}
                    @if (isCustomTemplate(templateId)) {
                    <span class="badge badge-xs badge-accent ml-1">custom</span>
                    }
                </p>
                <div class="grid grid-cols-2 gap-2">
                    @for (option of getOptionsForTemplate(templateId); track option.id) {
                    <button
                        type="button"
                        (click)="optionToggled.emit(option.id)"
                        class="btn min-h-[3rem]"
                        [class.btn-accent]="option.isCustom && selectedOptionIds().includes(option.id)"
                        [class.btn-primary]="!option.isCustom && selectedOptionIds().includes(option.id)"
                        [class.btn-outline]="!selectedOptionIds().includes(option.id)"
                    >
                        {{ option.name }}
                    </button>
                    }
                </div>
            </div>
            }
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
        return this.templates().find(t => t.id === templateId)?.name || templateId;
    }

    isCustomTemplate(templateId: string): boolean {
        // If template not found in built-in templates, it's custom
        return !this.templates().find(t => t.id === templateId);
    }

    optionBelongsToTemplate(option: OptionItem, templateId: string): boolean {
        const templateName = this.getTemplateName(templateId);
        return option.templateName === templateName;
    }

    getOptionsForTemplate(templateId: string): OptionItem[] {
        const templateName = this.getTemplateName(templateId);
        const filtered = this.options().filter(opt => opt.templateName === templateName);

        console.log(`🔍 Getting options for template "${templateId}" (name: "${templateName}")`);
        console.log('🔍 All options:', this.options());
        console.log('🔍 Filtered options:', filtered);

        return filtered;
    }
}

