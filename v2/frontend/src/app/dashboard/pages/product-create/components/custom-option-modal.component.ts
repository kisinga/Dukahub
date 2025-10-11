import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

/**
 * Custom Option Modal Component
 * Modal for adding custom option types (e.g., Bunch, Bundle)
 */
@Component({
    selector: 'app-custom-option-modal',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (isOpen()) {
        <dialog open class="modal">
            <div class="modal-box">
                <h3 class="text-lg font-bold mb-2">Add Custom Option</h3>
                <p class="text-sm text-base-content/70 mb-4">
                    Create a new option type that's not in the templates (e.g., Bunch, Bundle, Case)
                </p>

                <form [formGroup]="form()" (ngSubmit)="submitted.emit()">
                    <div class="space-y-4">
                        <!-- Option Name -->
                        <label class="floating-label">
                            <input
                                type="text"
                                formControlName="name"
                                placeholder="e.g., Bunch, Bundle, Case"
                                class="input"
                                [class.input-error]="form().get('name')?.invalid && form().get('name')?.touched"
                            />
                            <span>Option Name *</span>
                        </label>
                        <p class="text-xs text-base-content/60 -mt-2">
                            This will appear as a selectable option alongside templates
                        </p>

                        <!-- SKU -->
                        <label class="floating-label">
                            <input
                                type="text"
                                formControlName="sku"
                                placeholder="e.g., BUNCH, BND, CASE"
                                class="input"
                                maxlength="10"
                                [class.input-error]="form().get('sku')?.invalid && form().get('sku')?.touched"
                            />
                            <span>SKU Code *</span>
                        </label>
                        <p class="text-xs text-base-content/60 -mt-2">
                            Short code that will be used when creating SKUs
                        </p>
                    </div>

                    <div class="modal-action">
                        <button type="button" (click)="cancelled.emit()" class="btn btn-ghost">Cancel</button>
                        <button type="submit" class="btn btn-primary" [disabled]="form().invalid">
                            Add Option
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
export class CustomOptionModalComponent {
    // Inputs
    readonly isOpen = input.required<boolean>();
    readonly form = input.required<FormGroup>();

    // Outputs
    readonly submitted = output<void>();
    readonly cancelled = output<void>();
}

