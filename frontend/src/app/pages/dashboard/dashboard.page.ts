import { ChangeDetectionStrategy, Component, effect, Inject, signal, type OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppStateService } from '../../services/app-state.service';

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
    loadingUser = signal<boolean>(true);

    constructor(@Inject(AppStateService) private readonly stateService: AppStateService,
        private activatedRoute: ActivatedRoute) {
        this.loadingUser = this.stateService.loadingUser;

    }

    ngOnInit(): void {


    }
}
