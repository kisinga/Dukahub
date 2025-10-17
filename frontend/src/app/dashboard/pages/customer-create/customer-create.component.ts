import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-customer-create',
    imports: [CommonModule],
    template: `
    <div class="min-h-screen bg-base-100 p-8">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold mb-8">Create Customer</h1>
        <div class="alert alert-info">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <h3 class="font-bold">Coming Soon!</h3>
            <div class="text-xs">Customer creation form will be implemented here.</div>
          </div>
        </div>
      </div>
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerCreateComponent { }
