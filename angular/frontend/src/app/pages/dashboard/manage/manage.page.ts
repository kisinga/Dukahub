import { ChangeDetectionStrategy, Component, type OnInit } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
    standalone: true,
    imports: [
        RouterLink,
        RouterOutlet,
    ],
    templateUrl: './manage.page.html',
    styleUrl: './manage.page.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagePage implements OnInit {

    ngOnInit(): void { }

}
