import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { AdminManagementComponent } from './components/admin-management.component';
import { AuditTrailComponent } from './components/audit-trail.component';
import { GeneralSettingsComponent } from './components/general-settings.component';
import { MlModelStatusComponent } from './components/ml-model-status.component';
import { NotificationSettingsComponent } from './components/notification-settings.component';
import { NotificationTestComponent } from './components/notification-test.component';
import { PaymentMethodsComponent } from './components/payment-methods.component';

@Component({
  selector: 'app-settings',
  imports: [
    CommonModule,
    GeneralSettingsComponent,
    AdminManagementComponent,
    AuditTrailComponent,
    MlModelStatusComponent,
    NotificationSettingsComponent,
    NotificationTestComponent,
    PaymentMethodsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <h1 class="text-3xl font-bold">⚙️ Settings</h1>

      <!-- Tabs -->
      <div role="tablist" class="tabs tabs-box">
        <input
          type="radio"
          name="settings_tabs"
          class="tab"
          aria-label="General"
          [checked]="activeTab() === 'general'"
          (change)="setActiveTab('general')"
        />
        <input
          type="radio"
          name="settings_tabs"
          class="tab"
          aria-label="ML Model"
          [checked]="activeTab() === 'ml-model'"
          (change)="setActiveTab('ml-model')"
        />
        <input
          type="radio"
          name="settings_tabs"
          class="tab"
          aria-label="Notifications"
          [checked]="activeTab() === 'notifications'"
          (change)="setActiveTab('notifications')"
        />
        <input
          type="radio"
          name="settings_tabs"
          class="tab"
          aria-label="Test Notifications"
          [checked]="activeTab() === 'test-notifications'"
          (change)="setActiveTab('test-notifications')"
        />
        <input
          type="radio"
          name="settings_tabs"
          class="tab"
          aria-label="Admins"
          [checked]="activeTab() === 'admins'"
          (change)="setActiveTab('admins')"
        />
        <input
          type="radio"
          name="settings_tabs"
          class="tab"
          aria-label="Payments"
          [checked]="activeTab() === 'payments'"
          (change)="setActiveTab('payments')"
        />
        <input
          type="radio"
          name="settings_tabs"
          class="tab"
          aria-label="Audit Trail"
          [checked]="activeTab() === 'audit-trail'"
          (change)="setActiveTab('audit-trail')"
        />
      </div>

      <!-- Tab Content -->
      @switch (activeTab()) {
        @case ('general') {
          <app-general-settings />
        }
        @case ('ml-model') {
          <app-ml-model-status />
        }
        @case ('notifications') {
          <app-notification-settings />
        }
        @case ('test-notifications') {
          <app-notification-test />
        }
        @case ('admins') {
          <app-admin-management />
        }
        @case ('payments') {
          <app-payment-methods />
        }
        @case ('audit-trail') {
          <app-audit-trail />
        }
      }
    </div>
  `,
})
export class SettingsComponent {
  readonly activeTab = signal<
    | 'general'
    | 'ml-model'
    | 'notifications'
    | 'test-notifications'
    | 'admins'
    | 'payments'
    | 'audit-trail'
  >('general');

  setActiveTab(
    tab:
      | 'general'
      | 'ml-model'
      | 'notifications'
      | 'test-notifications'
      | 'admins'
      | 'payments'
      | 'audit-trail',
  ): void {
    this.activeTab.set(tab);
  }
}
