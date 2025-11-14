import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, ElementRef, effect, inject, input, OnInit, output, viewChild } from '@angular/core';
import { UsersService } from '../../../../core/services/users.service';

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
        <dialog #modal class="modal modal-bottom sm:modal-middle">
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
                    <!-- Loading State -->
                    @if (isLoading() && !user()) {
                        <div class="flex flex-col items-center justify-center py-8">
                            <span class="loading loading-spinner loading-lg text-primary"></span>
                            <p class="text-sm text-base-content/60 mt-4">Loading user details...</p>
                        </div>
                    }

                    <!-- Error State -->
                    @if (error() && !user()) {
                        <div role="alert" class="alert alert-error mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span class="flex-1">{{ error() }}</span>
                            <button (click)="usersService.clearError()" class="btn btn-sm">Dismiss</button>
                        </div>
                    }

                    <!-- User Details -->
                    @if (user()) {
                        <div class="space-y-4">
                            <!-- User Header -->
                            <div class="card bg-base-200">
                                <div class="card-body p-4">
                                    <div class="flex items-center gap-3 mb-3">
                                        <div class="avatar placeholder">
                                            <div class="bg-primary text-primary-content rounded-full w-16">
                                                <span class="text-2xl font-bold">{{ initials() }}</span>
                                            </div>
                                        </div>
                                        <div class="flex-1">
                                            <div class="font-bold text-lg">{{ fullName() }}</div>
                                            <div class="text-sm opacity-60">{{ user()!.emailAddress }}</div>
                                            @if (user()!.user?.verified) {
                                                <span class="badge badge-sm badge-success mt-1">Verified</span>
                                            }
                                        </div>
                                    </div>

                                    <div class="divider my-2"></div>

                                    <!-- Basic Information -->
                                    <div class="space-y-2 text-sm">
                                        <div class="flex justify-between">
                                            <span class="opacity-60">User ID:</span>
                                            <span class="font-mono font-medium">{{ user()!.id }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="opacity-60">Email:</span>
                                            <span>{{ user()!.emailAddress }}</span>
                                        </div>
                                        @if (user()!.user?.identifier) {
                                            <div class="flex justify-between">
                                                <span class="opacity-60">Identifier:</span>
                                                <span class="font-mono text-xs">{{ user()!.user!.identifier }}</span>
                                            </div>
                                        }
                                        @if (user()!.user?.lastLogin) {
                                            <div class="flex justify-between">
                                                <span class="opacity-60">Last Login:</span>
                                                <span>{{ formatDate(user()!.user!.lastLogin!) }}</span>
                                            </div>
                                        }
                                        <div class="flex justify-between">
                                            <span class="opacity-60">Created:</span>
                                            <span>{{ formatDate(user()!.createdAt) }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="opacity-60">Source:</span>
                                            <span class="badge badge-sm">{{ currentSource() === 'user_action' ? 'User Action' : 'System Event' }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Roles -->
                            @if (user()!.user?.roles && (user()!.user?.roles?.length ?? 0) > 0) {
                                <div class="card bg-base-200">
                                    <div class="card-body p-4">
                                        <h4 class="font-semibold mb-3">Roles & Permissions</h4>
                                        <div class="space-y-3">
                                            @for (role of user()!.user!.roles; track role.id) {
                                                <div class="border-l-4 border-primary pl-3">
                                                    <div class="font-medium">{{ role.code }}</div>
                                                    @if (role.description) {
                                                        <div class="text-sm opacity-60">{{ role.description }}</div>
                                                    }
                                                    @if (role.permissions && role.permissions.length > 0) {
                                                        <div class="flex flex-wrap gap-1 mt-2">
                                                            @for (permission of role.permissions; track permission) {
                                                                <span class="badge badge-xs">{{ permission }}</span>
                                                            }
                                                        </div>
                                                    }
                                                    @if (role.channels && role.channels.length > 0) {
                                                        <div class="text-xs opacity-60 mt-2">
                                                            Channels: {{ getChannelNames(role.channels) }}
                                                        </div>
                                                    }
                                                </div>
                                            }
                                        </div>
                                    </div>
                                </div>
                            }
                        </div>
                    } @else if (!isLoading() && !error()) {
                        <!-- Fallback: Show user ID only -->
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
                    }
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
export class UserDetailsModalComponent implements OnInit {
    readonly usersService = inject(UsersService);

    readonly userId = input<string | null>(null);
    readonly source = input<'user_action' | 'system_event'>('system_event');
    readonly closed = output<void>();

    // Modal reference using proper Angular viewChild pattern
    readonly modalRef = viewChild<ElementRef<HTMLDialogElement>>('modal');

    readonly currentUserId = computed(() => this.userId());
    readonly currentSource = computed(() => this.source());
    readonly user = this.usersService.currentUser;
    readonly isLoading = this.usersService.isLoading;
    readonly error = this.usersService.error;

    readonly fullName = computed(() => {
        const user = this.user();
        if (!user) return 'Unknown User';
        return `${user.firstName} ${user.lastName}`.trim() || 'Unknown User';
    });

    readonly initials = computed(() => {
        const user = this.user();
        if (!user) return '?';
        const firstName = user.firstName || '';
        const lastName = user.lastName || '';
        if (firstName && lastName) {
            return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        }
        return (firstName || lastName || user.id).charAt(0).toUpperCase();
    });

    constructor() {
        // Watch for userId changes and fetch user data
        effect(() => {
            const id = this.userId();
            if (id) {
                this.usersService.fetchAdministratorById(id);
            } else {
                this.usersService.clearCurrentUser();
            }
        });

        // Watch for userId changes and open/close modal
        effect(() => {
            const id = this.userId();
            const modal = this.modalRef()?.nativeElement;
            if (!modal) return;
            
            if (id) {
                modal.showModal();
            } else {
                modal.close();
            }
        });
    }

    ngOnInit(): void {
        const id = this.userId();
        if (id) {
            this.usersService.fetchAdministratorById(id);
        }
    }

    open(): void {
        const modal = this.modalRef()?.nativeElement;
        modal?.showModal();
    }

    close(): void {
        const modal = this.modalRef()?.nativeElement;
        modal?.close();
        this.closed.emit();
    }

    getInitials(): string {
        const id = this.currentUserId();
        if (!id) return '?';
        // Use first character of ID as initial
        return id.charAt(0).toUpperCase();
    }

    formatDate(dateString: string | null | undefined): string {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-KE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    getChannelNames(channels: Array<{ id: string; code: string; token: string }>): string {
        return channels.map(c => c.code).join(', ');
    }
}

