import { ChangeDetectionStrategy, Component, effect, Inject, type OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DbService } from '../../services/db.service';

@Component({
    standalone: true,
    imports: [
        RouterLink,
        RouterOutlet,
        FormsModule,
        ReactiveFormsModule,
        RouterLinkActive,
    ],
    templateUrl: './dashboard.page.html',
    styleUrl: './dashboard.page.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit {
    constructor(@Inject(DbService) private readonly db: DbService,
        private activatedRoute: ActivatedRoute) {

    }

    ngOnInit(): void {


    }
}
