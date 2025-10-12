import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { Template } from '../services/template-state.service';

/**
 * Template Picker Component
 * 
 * Displays template selection grid with built-in templates + custom option button.
 * 
 * Responsibilities:
 * - Display template cards
 * - Handle template selection
 * - Trigger custom option modal
 * 
 * Pure presentation - all logic delegated to parent
 */
@Component({
    selector: 'app-template-picker',
    standalone: true,
    template: `
        <div>
            <div class="flex items-center justify-between mb-2">
                <p class="text-sm opacity-70">What varies?</p>
                @if (selectedTemplates().length > 0) {
                <button 
                    type="button" 
                    (click)="clearAll.emit()" 
                    class="btn btn-xs btn-ghost"
                >
                    Reset All
                </button>
                }
            </div>
            
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                @for (template of templates(); track template.id) {
                <button
                    type="button"
                    (click)="templateToggled.emit(template.id)"
                    class="btn min-h-[3rem]"
                    [class.btn-primary]="isSelected(template.id)"
                    [class.btn-outline]="!isSelected(template.id)"
                >
                    {{ template.name }}
                </button>
                }

                <!-- Add Custom Template Option -->
                <button
                    type="button"
                    (click)="customOptionRequested.emit()"
                    class="btn btn-outline min-h-[3rem] gap-1"
                >
                    ➕ Custom
                </button>
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplatePickerComponent {
    // Inputs
    readonly templates = input.required<Template[]>();
    readonly selectedTemplates = input.required<string[]>();

    // Outputs
    readonly templateToggled = output<string>();
    readonly customOptionRequested = output<void>();
    readonly clearAll = output<void>();

    /**
     * Check if template is selected
     */
    isSelected(templateId: string): boolean {
        return this.selectedTemplates().includes(templateId);
    }
}

