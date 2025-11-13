import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, output } from '@angular/core';

/**
 * User Details Modal Component
 * 
 * Displays user information in a modal dialog.
 * Used for viewing user details from audit trail and other contexts.
 */
@Component({
    selector: 'app-user-details-modal',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <dialog [id]="modalId" class="modal modal-bottom sm:modal-middle">
            <div class="modal-box max-w-md">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-bold text-lg">👤 User Details</h3>
                    <button 
                        class="btn btn-ghost btn-sm btn-circle"
                        (click)="close()"
                        aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                @if (currentUserId()) {
                    <div class="space-y-4">
                        <div class="card bg-base-200">
                            <div class="card-body p-4">
                                <div class="flex items-center gap-3 mb-3">
                                    <div class="avatar placeholder">
                                        <div class="bg-primary text-primary-content rounded-full w-12">
                                            <span class="text-lg font-bold">{{ getInitials() }}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div class="font-bold">User ID: {{ currentUserId() }}</div>
                                        <div class="text-sm opacity-60">User information</div>
                                    </div>
                                </div>

                                <div class="divider my-2"></div>

                                <div class="space-y-2 text-sm">
                                    <div class="flex justify-between">
                                        <span class="opacity-60">User ID:</span>
                                        <span class="font-mono font-medium">{{ currentUserId() }}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="opacity-60">Source:</span>
                                        <span class="badge badge-sm">{{ currentSource() === 'user_action' ? 'User Action' : 'System Event' }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="alert alert-info">
                            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span class="text-xs">Full user profile integration coming soon. This will show detailed user information including name, email, and role.</span>
                        </div>
                    </div>
                }

                <div class="modal-action">
                    <button class="btn btn-primary" (click)="close()">Close</button>
                </div>
            </div>
            <form method="dialog" class="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
    `,
})
export class UserDetailsModalComponent {
    readonly userId = input<string | null>(null);
    readonly source = input<'user_action' | 'system_event'>('system_event');
    readonly modalId = 'user-details-modal';
    readonly closed = output<void>();

    readonly currentUserId = computed(() => this.userId());
    readonly currentSource = computed(() => this.source());

    constructor() {
        // Watch for userId changes and open/close modal
        effect(() => {
            const id = this.userId();
            const modal = document.getElementById(this.modalId) as HTMLDialogElement;
            if (!modal) return;
            
            if (id) {
                modal.showModal();
            } else {
                modal.close();
            }
        });
    }

    open(): void {
        const modal = document.getElementById(this.modalId) as HTMLDialogElement;
        if (modal) {
            modal.showModal();
        }
    }

    close(): void {
        const modal = document.getElementById(this.modalId) as HTMLDialogElement;
        if (modal) {
            modal.close();
        }
        this.closed.emit();
    }

    getInitials(): string {
        const id = this.currentUserId();
        if (!id) return '?';
        // Use first character of ID as initial
        return id.charAt(0).toUpperCase();
    }
}

