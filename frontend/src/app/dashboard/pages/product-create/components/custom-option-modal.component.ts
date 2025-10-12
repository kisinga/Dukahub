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
        <dialog open class="modal modal-bottom sm:modal-middle">
            <div class="modal-box max-w-lg">
                <h3 class="font-bold text-lg mb-2">➕ Create Custom Option</h3>
                <p class="text-sm opacity-70 mb-4">e.g., Packaging → Single, Box, Carton</p>

                <form [formGroup]="form()" (ngSubmit)="submitted.emit()">
                    <div class="space-y-4">
                        <!-- Option Type Name -->
                        <div class="bg-accent/10 p-3 rounded-lg">
                            <label class="text-sm font-semibold mb-1 block">Option Type</label>
                            <input
                                type="text"
                                formControlName="name"
                                placeholder="e.g., Packaging, Bundle Type"
                                class="input input-bordered w-full"
                                [class.input-error]="form().get('name')?.invalid && form().get('name')?.touched"
                                autofocus
                            />
                        </div>

                        <!-- Values (Multiple) -->
                        <div class="bg-accent/10 p-3 rounded-lg">
                            <div class="flex items-center justify-between mb-2">
                                <label class="text-sm font-semibold">Values</label>
                                <span class="text-xs opacity-60">One per line</span>
                            </div>
                            <textarea
                                formControlName="values"
                                placeholder="Single&#10;Box of 12&#10;Carton of 24"
                                class="textarea textarea-bordered w-full"
                                rows="4"
                                [class.textarea-error]="form().get('values')?.invalid && form().get('values')?.touched"
                            ></textarea>
                            <p class="text-xs opacity-60 mt-1">
                                Each line = one value. They'll auto-select.
                            </p>
                        </div>
                    </div>

                    <div class="modal-action">
                        <button type="button" (click)="cancelled.emit()" class="btn">Cancel</button>
                        <button type="submit" class="btn btn-accent min-h-[3rem]" [disabled]="form().invalid">
                            ✓ Add Custom Option
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

