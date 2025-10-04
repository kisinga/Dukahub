import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-signup',
    imports: [RouterLink],
    template: `
    <div class="min-h-screen flex items-center justify-center bg-base-200">
      <div class="card w-96 bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title justify-center text-2xl">Sign Up</h2>
          <p class="text-center text-base-content/60 mb-4">Coming soon</p>
          <a routerLink="/" class="btn btn-primary">Back to Home</a>
        </div>
      </div>
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignupComponent { }

