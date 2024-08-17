import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, type OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DbService } from '../../services/db.service';

@Component({
    standalone: true,
    imports: [
        FormsModule,
        ReactiveFormsModule,
        CommonModule,
    ],
    templateUrl: './login.page.html',
    styleUrl: './login.page.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage implements OnInit {
    email = "";
    password = "";
    errorMessage = "";
    isLoading = false;

    constructor(
        @Inject(DbService) private readonly db: DbService,
        @Inject(Router) private readonly router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    async login(): Promise<void> {
        if (this.isLoading) return; // Prevent multiple submissions

        this.isLoading = true;
        this.errorMessage = "";
        this.cdr.detectChanges(); // Trigger change detection to show loading state and clear error

        try {
            const result = await this.db.login(this.email, this.password);
            if (result === false) {
                this.errorMessage = "Invalid email or password. Please try again.";
            } else {
                console.log('Login successful');
                this.router.navigate(['/dashboard']);
            }
        } catch (error) {
            console.error('Login error:', error);
            this.errorMessage = "An unexpected error occurred. Please try again later.";
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges(); // Trigger change detection to hide loading state and show error if any
        }
    }

    ngOnInit(): void { }
}