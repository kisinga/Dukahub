import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-products',
    imports: [],
    template: `
    <div class="space-y-6">
      <h1 class="text-3xl font-bold">Products</h1>
      <div class="card bg-base-100 shadow-lg">
        <div class="card-body">
          <p class="text-center text-base-content/60 py-20">Product management coming soon...</p>
        </div>
      </div>
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsComponent { }

