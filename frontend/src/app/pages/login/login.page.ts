import { ChangeDetectionStrategy, Component, type OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

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

    ngOnInit(): void { }

}
