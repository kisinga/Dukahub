import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { AdminManagementComponent } from './components/admin-management.component';
import { GeneralSettingsComponent } from './components/general-settings.component';
import { MlModelStatusComponent } from './components/ml-model-status.component';
import { PaymentMethodsComponent } from './components/payment-methods.component';

@Component({
  selector: 'app-settings',
  imports: [
    CommonModule,
    GeneralSettingsComponent,
    AdminManagementComponent,
    MlModelStatusComponent,
    PaymentMethodsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <h1 class="text-3xl font-bold">⚙️ Settings</h1>
      
      <!-- Tabs -->
      <div role="tablist" class="tabs tabs-box">
        <input type="radio" name="settings_tabs" 
               class="tab" aria-label="General" 
               [checked]="activeTab() === 'general'"
               (change)="setActiveTab('general')" />
        <input type="radio" name="settings_tabs" 
               class="tab" aria-label="ML Model" 
               [checked]="activeTab() === 'ml-model'"
               (change)="setActiveTab('ml-model')" />
        <input type="radio" name="settings_tabs" 
               class="tab" aria-label="Admins" 
               [checked]="activeTab() === 'admins'"
               (change)="setActiveTab('admins')" />
        <input type="radio" name="settings_tabs" 
               class="tab" aria-label="Payments" 
               [checked]="activeTab() === 'payments'"
               (change)="setActiveTab('payments')" />
      </div>
      
      <!-- Tab Content -->
      @switch (activeTab()) {
        @case ('general') {
          <app-general-settings />
        }
        @case ('ml-model') {
          <app-ml-model-status />
        }
        @case ('admins') {
          <app-admin-management />
        }
        @case ('payments') {
          <app-payment-methods />
        }
      }
    </div>
  `,
})
export class SettingsComponent {
  readonly activeTab = signal<'general' | 'ml-model' | 'admins' | 'payments'>('general');

  setActiveTab(tab: 'general' | 'ml-model' | 'admins' | 'payments'): void {
    this.activeTab.set(tab);
  }
}

