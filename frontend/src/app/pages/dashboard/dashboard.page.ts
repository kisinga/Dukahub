import { ChangeDetectionStrategy, Component, type OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
    standalone: true,
    imports: [
        RouterLink,
        RouterOutlet,
        FormsModule,
        ReactiveFormsModule,
    ],
    templateUrl: './dashboard.page.html',
    styleUrl: './dashboard.page.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit {

    ngOnInit(): void { }

}
