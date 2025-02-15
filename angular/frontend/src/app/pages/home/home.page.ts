import { ChangeDetectionStrategy, Component, type OnInit } from '@angular/core';

@Component({
    standalone: true,
    imports: [],
    templateUrl: './home.page.html',
    styleUrl: './home.page.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit {

    ngOnInit(): void { }

}
