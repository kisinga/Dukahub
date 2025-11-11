import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LanguageCode } from '../../../../core/graphql/generated/graphql';
import { GET_PAYMENT_METHODS } from '../../../../core/graphql/operations.graphql';
import type { GetPaymentMethodsQuery } from '../../../../core/graphql/generated/graphql';
import { ApolloService } from '../../../../core/services/apollo.service';
import { CompanyService } from '../../../../core/services/company.service';
import { CreatePaymentMethodInput, PaymentMethod, SettingsService, UpdatePaymentMethodInput } from '../../../../core/services/settings.service';

@Component({
  selector: 'app-payment-methods',
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card bg-base-100 shadow-lg">
      <div class="card-body">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-lg">💳 Payment Methods</h3>
          <button class="btn btn-primary btn-sm" (click)="openCreateModal()">
            ➕ Add Payment Method
          </button>
        </div>
        
        <!-- Payment Methods Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (method of paymentMethods(); track method.id) {
            <div class="card bg-base-200">
              <div class="card-body">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    @if (method.customFields?.imageAsset; as icon) {
                      <img [src]="icon.preview" 
                           class="w-12 h-12 object-contain" 
                           [alt]="method.name" />
                    } @else {
                      <div class="w-12 h-12 bg-base-300 rounded flex items-center justify-center">
                        <span class="text-2xl">💳</span>
                      </div>
                    }
                    <div>
                      <div class="font-bold">{{ method.name }}</div>
                      <div class="text-xs opacity-70">{{ method.code }}</div>
                      @if (method.description) {
                        <div class="text-xs opacity-60">{{ method.description }}</div>
                      }
                    </div>
                  </div>
                  
                  <!-- Toggle Active Status -->
                  <input type="checkbox" 
                         class="toggle toggle-sm"
                         [checked]="method.customFields?.isActive"
                         [disabled]="isDefaultMethod(method.code) || settingsService.loading()"
                         (change)="toggleMethodStatus(method, $event)" />
                </div>
                
                @if (!isDefaultMethod(method.code)) {
                  <div class="card-actions justify-end mt-2">
                    <button class="btn btn-ghost btn-xs" 
                            (click)="editMethod(method)"
                            [disabled]="settingsService.loading()">
                      Edit
                    </button>
                    <button class="btn btn-ghost btn-xs text-error" 
                            (click)="deleteMethod(method)"
                            [disabled]="settingsService.loading()">
                      Delete
                    </button>
                  </div>
                }
              </div>
            </div>
          } @empty {
            <div class="col-span-full text-center py-8 text-base-content/60">
              No payment methods found
            </div>
          }
        </div>
      </div>
    </div>
    
    <!-- Create/Edit Modal -->
    @if (showModal()) {
      <dialog class="modal modal-open">
        <div class="modal-box">
          <h3 class="font-bold text-lg mb-4">
            {{ isEditing() ? 'Edit' : 'Create' }} Payment Method
          </h3>
          <form [formGroup]="paymentMethodForm" (ngSubmit)="submitForm()">
            <div class="form-control mb-4">
              <label class="label">
                <span class="label-text">Name</span>
              </label>
              <input 
                type="text" 
                placeholder="Enter payment method name" 
                class="input input-bordered"
                formControlName="name" />
              @if (paymentMethodForm.get('name')?.invalid && paymentMethodForm.get('name')?.touched) {
                <label class="label">
                  <span class="label-text-alt text-error">Name is required</span>
                </label>
              }
            </div>

            <div class="form-control mb-4">
              <label class="label">
                <span class="label-text">Code</span>
              </label>
              <input 
                type="text" 
                placeholder="Enter unique code" 
                class="input input-bordered"
                formControlName="code" />
              @if (paymentMethodForm.get('code')?.invalid && paymentMethodForm.get('code')?.touched) {
                <label class="label">
                  <span class="label-text-alt text-error">Code is required</span>
                </label>
              }
            </div>

            <div class="form-control mb-4">
              <label class="label">
                <span class="label-text">Description (Optional)</span>
              </label>
              <textarea 
                placeholder="Enter description" 
                class="textarea textarea-bordered"
                formControlName="description"></textarea>
            </div>

            <div class="form-control mb-4">
              <label class="label">
                <span class="label-text">Status</span>
              </label>
              <div class="flex items-center gap-2">
                <input type="checkbox" 
                       class="toggle toggle-sm"
                       formControlName="isActive" />
                <span class="text-sm">Active</span>
              </div>
            </div>

            <div class="modal-action">
              <button type="button" class="btn" (click)="closeModal()">
                Cancel
              </button>
              <button 
                type="submit" 
                class="btn btn-primary"
                [disabled]="paymentMethodForm.invalid || settingsService.loading()">
                @if (settingsService.loading()) {
                  <span class="loading loading-spinner loading-xs"></span>
                }
                {{ isEditing() ? 'Update' : 'Create' }}
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
export class PaymentMethodsComponent {
  readonly settingsService = inject(SettingsService);
  private readonly apolloService = inject(ApolloService);
  private readonly companyService = inject(CompanyService);
  private readonly fb = inject(FormBuilder);

  private readonly paymentMethodsSignal = signal<PaymentMethod[]>([]);
  readonly paymentMethods = this.paymentMethodsSignal.asReadonly();
  readonly showModal = signal(false);
  readonly isEditing = signal(false);
  readonly paymentMethodForm: FormGroup;

  private editingMethod: PaymentMethod | null = null;
  private currentFetchChannelId: string | null = null;

  constructor() {
    this.paymentMethodForm = this.createPaymentMethodForm();

    effect(() => {
      const channel = this.companyService.activeChannel();

      if (!channel) {
        this.paymentMethodsSignal.set([]);
        return;
      }

      void this.loadPaymentMethods(channel.id);
    });
  }

  private createPaymentMethodForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      code: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      isActive: [true],
    });
  }

  isDefaultMethod(code: string): boolean {
    return code === 'marki-cash' || code === 'marki-mpesa';
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingMethod = null;
    this.paymentMethodForm.reset({ isActive: true });
    this.showModal.set(true);
  }

  editMethod(method: PaymentMethod): void {
    this.isEditing.set(true);
    this.editingMethod = method;
    this.paymentMethodForm.patchValue({
      name: method.name,
      code: method.code,
      description: method.description || '',
      isActive: method.customFields?.isActive ?? true,
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.isEditing.set(false);
    this.editingMethod = null;
    this.paymentMethodForm.reset();
  }

  async submitForm(): Promise<void> {
    if (this.paymentMethodForm.invalid) return;

    const formValue = this.paymentMethodForm.value;
    const channelId = this.companyService.activeChannel()?.id;

    if (this.isEditing() && this.editingMethod) {
      const input: UpdatePaymentMethodInput = {
        id: this.editingMethod.id,
        name: formValue.name,
        description: formValue.description,
        isActive: formValue.isActive,
      };

      await this.settingsService.updatePaymentMethod(input);
    } else {
      const input: CreatePaymentMethodInput = {
        name: formValue.name,
        code: formValue.code,
        description: formValue.description,
        enabled: true,
        handler: {
          code: 'manual-payment-handler',
          arguments: [],
        },
        translations: [
          {
            languageCode: LanguageCode.en,
            name: formValue.name,
            description: formValue.description,
          },
        ],
      };

      await this.settingsService.createPaymentMethod(input);
    }

    if (!this.settingsService.error()) {
      if (channelId) {
        await this.loadPaymentMethods(channelId);
      }
      this.closeModal();
    }
  }

  async toggleMethodStatus(method: PaymentMethod, event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;

    if (this.isDefaultMethod(method.code)) return;

    const input: UpdatePaymentMethodInput = {
      id: method.id,
      isActive: target.checked,
    };

    await this.settingsService.updatePaymentMethod(input);

    const channel = this.companyService.activeChannel();
    if (channel) {
      await this.loadPaymentMethods(channel.id);
    }
  }

  async deleteMethod(method: PaymentMethod): Promise<void> {
    // TODO: Implement delete functionality
    // This would require a delete mutation in the backend
    console.log('Delete payment method:', method.name);
  }

  private async loadPaymentMethods(channelId: string): Promise<void> {
    this.currentFetchChannelId = channelId;
    this.settingsService.loading.set(true);
    this.settingsService.clearError();

    try {
      const client = this.apolloService.getClient();
      const result = await client.query<GetPaymentMethodsQuery>({
        query: GET_PAYMENT_METHODS,
        fetchPolicy: 'network-only',
      });

      const methods = result.data?.paymentMethods.items ?? [];

      if (this.currentFetchChannelId === channelId) {
        const normalized: PaymentMethod[] = methods.map(method => ({
          id: method.id,
          code: method.code,
          name: method.name,
          description: method.description,
          enabled: method.enabled,
          customFields: method.customFields
            ? {
                imageAsset: method.customFields.imageAsset
                  ? {
                      id: method.customFields.imageAsset.id,
                      preview: method.customFields.imageAsset.preview,
                    }
                  : null,
                isActive: method.customFields.isActive ?? null,
              }
            : null,
        }));

        this.paymentMethodsSignal.set(normalized);
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
      this.settingsService.error.set('Failed to load payment methods');
    } finally {
      this.settingsService.loading.set(false);
    }
  }
}
