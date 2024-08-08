import { ChangeDetectionStrategy, Component, Inject, input, type OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DbService } from '../../services/db.service';
import { Router } from '@angular/router';

@Component({
    standalone: true,
    imports: [
        FormsModule,
        ReactiveFormsModule,
    ],
    templateUrl: './login.page.html',
    styleUrl: './login.page.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage implements OnInit {

    email = ""
    password = ""

    constructor(
        @Inject(DbService) private readonly db: DbService,
        @Inject(Router) private readonly router: Router,
    ) {
    }

    async login(): Promise<void> {
        let result = await this.db.login(this.email, this.password);
        if (result === false) {
            console.log('Login failed');
        } else {
            console.log('Login successful');

            // navigate to dashboard
            this.router.navigate(['/dashboard']);
        }
        return;
    }

    ngOnInit(): void { }
}
