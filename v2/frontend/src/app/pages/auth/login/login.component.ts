import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-login',
    imports: [RouterLink, FormsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    // Form state
    protected readonly email = signal('');
    protected readonly password = signal('');
    protected readonly rememberMe = signal(false);
    protected readonly errorMessage = signal<string | null>(null);

    // Loading state from auth service
    protected readonly isLoading = this.authService.isLoading;

    async onSubmit(): Promise<void> {
        if (!this.email() || !this.password()) {
            this.errorMessage.set('Please enter both email and password');
            return;
        }

        // Clear previous errors
        this.errorMessage.set(null);

        try {
            // Attempt login using generated types
            const result = await this.authService.login({
                username: this.email(),
                password: this.password(),
                rememberMe: this.rememberMe(),
            });

            // Check result type using discriminated union
            if (result.__typename === 'CurrentUser') {
                // Redirect to dashboard on successful login
                this.router.navigate(['/dashboard']);
            } else if (result.__typename === 'InvalidCredentialsError' || result.__typename === 'NativeAuthStrategyError') {
                // Show error message from the API
                this.errorMessage.set(result.message);
            }
        } catch (error) {
            // Handle unexpected errors
            this.errorMessage.set(error instanceof Error ? error.message : 'Login failed. Please try again.');
        }
    }
}
