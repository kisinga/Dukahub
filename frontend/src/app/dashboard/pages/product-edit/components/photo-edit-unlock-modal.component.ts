import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';

/**
 * Photo Edit Unlock Modal Component
 * 
 * Shows a warning modal when user wants to edit product photos.
 * This triggers model retraining which is expensive, so we want to discourage arbitrary modifications.
 */
@Component({
    selector: 'app-photo-edit-unlock-modal',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <!-- Modal -->
        <dialog class="modal modal-open">
            <div class="modal-box max-w-md">
                <!-- Header -->
                <div class="flex items-center gap-3 mb-4">
                    <div class="text-4xl">⚠️</div>
                    <div>
                        <h3 class="font-bold text-lg">Edit Product Photos</h3>
                        <p class="text-sm opacity-70">This will trigger AI model retraining</p>
                    </div>
                </div>

                <!-- Warning Content -->
                <div class="space-y-3 mb-6">
                    <div class="alert alert-warning">
                        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div class="text-sm">
                            <strong>Expensive Operation:</strong> Changing product photos will trigger AI model retraining, which is computationally expensive.
                        </div>
                    </div>

                    <div class="bg-info/10 p-3 rounded text-sm">
                        <p><strong>What happens when you edit photos:</strong></p>
                        <ul class="list-disc list-inside mt-2 space-y-1 text-xs">
                            <li>AI model will retrain with new product images</li>
                            <li>Recognition accuracy may temporarily decrease</li>
                            <li>Process can take several minutes to complete</li>
                            <li>System resources will be used for training</li>
                        </ul>
                    </div>

                    <div class="bg-base-200 p-3 rounded text-sm">
                        <p><strong>💡 Tip:</strong> Only edit photos if the current ones are incorrect or missing. Consider if the change is really necessary.</p>
                    </div>
                </div>

                <!-- Actions -->
                <div class="modal-action">
                    <button 
                        type="button" 
                        (click)="onCancel()" 
                        class="btn btn-ghost"
                    >
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        (click)="onConfirm()" 
                        class="btn btn-warning"
                    >
                        <span class="loading loading-spinner loading-sm" [class.hidden]="!isConfirming()"></span>
                        I Understand - Edit Photos
                    </button>
                </div>
            </div>
        </dialog>
    `,
})
export class PhotoEditUnlockModalComponent {
    // State
    readonly isConfirming = signal(false);

    // Outputs
    readonly confirmed = output<void>();
    readonly cancelled = output<void>();

    /**
     * Handle confirmation
     */
    onConfirm(): void {
        this.isConfirming.set(true);

        // Add a small delay to show the loading state
        setTimeout(() => {
            this.confirmed.emit();
        }, 500);
    }

    /**
     * Handle cancellation
     */
    onCancel(): void {
        this.cancelled.emit();
    }
}

