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

        // Attempt login
        const result = await this.authService.login({
            username: this.email(),
            password: this.password(),
            rememberMe: this.rememberMe(),
        });

        if (result.success) {
            // Redirect to dashboard on successful login
            this.router.navigate(['/dashboard']);
        } else {
            // Show error message
            this.errorMessage.set(result.error || 'Login failed. Please try again.');
        }
    }
}
