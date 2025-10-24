import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InviteAdministratorInput, SettingsService } from '../../../../core/services/settings.service';

@Component({
    selector: 'app-admin-management',
    imports: [CommonModule, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="card bg-base-100 shadow-lg">
      <div class="card-body">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-lg">👥 Channel Administrators</h3>
          <button class="btn btn-primary btn-sm" (click)="openInviteModal()">
            ➕ Invite Admin
          </button>
        </div>
        
        <!-- Admin List -->
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (admin of administrators(); track admin.id) {
                <tr>
                  <td>
                    <div class="flex items-center gap-3">
                      <div class="avatar placeholder">
                        <div class="bg-neutral text-neutral-content rounded-full w-8">
                          <span class="text-xs">{{ getInitials(admin.firstName, admin.lastName) }}</span>
                        </div>
                      </div>
                      <div>
                        <div class="font-bold">{{ admin.firstName }} {{ admin.lastName }}</div>
                      </div>
                    </div>
                  </td>
                  <td>{{ admin.emailAddress }}</td>
                  <td>
                    @if (admin.user?.verified) {
                      <span class="badge badge-success">Verified</span>
                    } @else {
                      <span class="badge badge-warning">Pending</span>
                    }
                  </td>
                  <td>
                    <div class="flex gap-2">
                      @if (!admin.user?.verified) {
                        <button class="btn btn-ghost btn-xs" (click)="resendInvite(admin)">
                          📧 Resend
                        </button>
                      }
                      @if (admin.id !== currentAdminId) {
                        <button class="btn btn-ghost btn-xs text-error" (click)="removeAdmin(admin)">
                          🗑️ Remove
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="text-center py-8 text-base-content/60">
                    No administrators found
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- Invite Modal -->
    @if (showInviteModal()) {
      <dialog class="modal modal-open">
        <div class="modal-box">
          <h3 class="font-bold text-lg mb-4">Invite Administrator</h3>
          <form [formGroup]="inviteForm" (ngSubmit)="submitInvite()">
            <div class="form-control mb-4">
              <label class="label">
                <span class="label-text">First Name</span>
              </label>
              <input 
                type="text" 
                placeholder="Enter first name" 
                class="input input-bordered"
                formControlName="firstName" />
              @if (inviteForm.get('firstName')?.invalid && inviteForm.get('firstName')?.touched) {
                <label class="label">
                  <span class="label-text-alt text-error">First name is required</span>
                </label>
              }
            </div>

            <div class="form-control mb-4">
              <label class="label">
                <span class="label-text">Last Name</span>
              </label>
              <input 
                type="text" 
                placeholder="Enter last name" 
                class="input input-bordered"
                formControlName="lastName" />
              @if (inviteForm.get('lastName')?.invalid && inviteForm.get('lastName')?.touched) {
                <label class="label">
                  <span class="label-text-alt text-error">Last name is required</span>
                </label>
              }
            </div>

            <div class="form-control mb-4">
              <label class="label">
                <span class="label-text">Email Address</span>
              </label>
              <input 
                type="email" 
                placeholder="Enter email address" 
                class="input input-bordered"
                formControlName="emailAddress" />
              @if (inviteForm.get('emailAddress')?.invalid && inviteForm.get('emailAddress')?.touched) {
                <label class="label">
                  <span class="label-text-alt text-error">
                    @if (inviteForm.get('emailAddress')?.errors?.['required']) {
                      Email is required
                    } @else if (inviteForm.get('emailAddress')?.errors?.['email']) {
                      Please enter a valid email
                    }
                  </span>
                </label>
              }
            </div>

            <div class="modal-action">
              <button type="button" class="btn" (click)="closeInviteModal()">
                Cancel
              </button>
              <button 
                type="submit" 
                class="btn btn-primary"
                [disabled]="inviteForm.invalid || settingsService.loading()">
                @if (settingsService.loading()) {
                  <span class="loading loading-spinner loading-xs"></span>
                }
                Send Invite
              </button>
            </div>
          </form>
        </div>
      </dialog>
    }

    <!-- Error Message -->
    @if (settingsService.error(); as error) {
      <div class="alert alert-error mt-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ error }}</span>
      </div>
    }
  `,
})
export class AdminManagementComponent {
    readonly settingsService = inject(SettingsService);
    private readonly fb = inject(FormBuilder);

    readonly administrators = this.settingsService.administrators;
    readonly showInviteModal = signal(false);
    readonly inviteForm: FormGroup;

    // TODO: Get current admin ID from auth service
    readonly currentAdminId = 'current-admin-id';

    constructor() {
        this.inviteForm = this.createInviteForm();

        // Load administrators on component init
        effect(() => {
            this.settingsService.getChannelAdministrators();
        });
    }

    private createInviteForm(): FormGroup {
        return this.fb.group({
            firstName: ['', [Validators.required, Validators.minLength(2)]],
            lastName: ['', [Validators.required, Validators.minLength(2)]],
            emailAddress: ['', [Validators.required, Validators.email]],
        });
    }

    openInviteModal(): void {
        this.inviteForm.reset();
        this.showInviteModal.set(true);
    }

    closeInviteModal(): void {
        this.showInviteModal.set(false);
        this.inviteForm.reset();
    }

    async submitInvite(): Promise<void> {
        if (this.inviteForm.invalid) return;

        const input: InviteAdministratorInput = {
            firstName: this.inviteForm.value.firstName,
            lastName: this.inviteForm.value.lastName,
            emailAddress: this.inviteForm.value.emailAddress,
        };

        const result = await this.settingsService.inviteAdministrator(input);

        if (result) {
            this.closeInviteModal();
        }
    }

    async resendInvite(admin: any): Promise<void> {
        // TODO: Implement resend invite functionality
        console.log('Resend invite for:', admin.emailAddress);
    }

    async removeAdmin(admin: any): Promise<void> {
        // TODO: Implement remove admin functionality
        console.log('Remove admin:', admin.emailAddress);
    }

    getInitials(firstName: string, lastName: string): string {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
}
