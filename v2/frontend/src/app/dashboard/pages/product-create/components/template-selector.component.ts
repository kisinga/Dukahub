import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface Template {
    id: string;
    name: string;
    options: { name: string; sku: string }[];
}

/**
 * Template Selector Component
 * Displays template chips for quick setup (Weight, Size, Color, etc.)
 */
@Component({
    selector: 'app-template-selector',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <!-- Simple template chips - no wrapper needed -->
        <div class="flex flex-wrap gap-2">
            @for (template of templates(); track template.id) {
            <button
                type="button"
                (click)="templateToggled.emit(template.id)"
                class="btn btn-xs"
                [class.btn-primary]="selectedTemplateIds().includes(template.id)"
                [class.btn-outline]="!selectedTemplateIds().includes(template.id)"
            >
                {{ template.name }}
            </button>
            }
        </div>
    `,
})
export class TemplateSelectorComponent {
    // Inputs
    readonly templates = input.required<Template[]>();
    readonly selectedTemplateIds = input.required<string[]>();

    // Outputs
    readonly templateToggled = output<string>();
    readonly customOptionClicked = output<void>();
    readonly clearAllClicked = output<void>();
}

