import { ChangeDetectionStrategy, Component, type OnInit } from '@angular/core';

@Component({
    standalone: true,
    imports: [],
    templateUrl: './open-close.page.html',
    styleUrl: './open-close.page.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenClosePage implements OnInit {

    ngOnInit(): void { }

}
