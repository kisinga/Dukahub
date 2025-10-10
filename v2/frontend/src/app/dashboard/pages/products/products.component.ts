import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-products',
  imports: [RouterLink],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 class="text-3xl font-bold">Products</h1>
        
        <a routerLink="/dashboard/products/create" class="btn btn-primary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Create Product
        </a>
      </div>

      <div class="card bg-base-100 shadow-lg">
        <div class="card-body">
          <p class="text-center text-base-content/60 py-20">Product list coming soon...</p>
          <p class="text-center text-sm text-base-content/40">
            In the meantime, you can create products using the button above.
          </p>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsComponent { }

