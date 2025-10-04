import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
    selector: 'app-login',
    imports: [RouterLink, FormsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
    protected readonly email = signal('');
    protected readonly password = signal('');
    protected readonly isLoading = signal(false);

    constructor(private router: Router) { }

    async onSubmit(): Promise<void> {
        if (!this.email() || !this.password()) {
            return;
        }

        this.isLoading.set(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));

        // For now, just redirect to dashboard
        this.router.navigate(['/dashboard']);
    }
}
