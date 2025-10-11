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
        <div class="card card-border bg-base-100">
            <div class="card-body">
                <h2 class="card-title">Quick Setup</h2>
                <p class="text-sm text-base-content/70 mb-3">
                    Choose a template to quickly set up common product variants
                </p>

                <!-- Template Chips (Multi-select) -->
                <div class="flex flex-wrap gap-2">
                    @for (template of templates(); track template.id) {
                    <button
                        type="button"
                        (click)="templateToggled.emit(template.id)"
                        class="btn btn-sm"
                        [class.btn-primary]="selectedTemplateIds().includes(template.id)"
                        [class.btn-outline]="!selectedTemplateIds().includes(template.id)"
                    >
                        @if (selectedTemplateIds().includes(template.id)) {
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
                        {{ template.name }}
                    </button>
                    }

                    <div class="divider divider-horizontal mx-2"></div>

                    <!-- Add Custom Option Button -->
                    <button
                        type="button"
                        (click)="customOptionClicked.emit()"
                        class="btn btn-sm btn-outline"
                    >
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
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                        </svg>
                        Add Custom
                    </button>

                    @if (selectedTemplateIds().length > 0) {
                    <button
                        type="button"
                        (click)="clearAllClicked.emit()"
                        class="btn btn-sm btn-ghost"
                    >
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
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                        Clear All
                    </button>
                    }
                </div>
                <p class="text-xs text-base-content/60 mt-2">
                    💡 Select templates or add custom options (e.g., Bunch, Bundle, Case)
                </p>
            </div>
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

