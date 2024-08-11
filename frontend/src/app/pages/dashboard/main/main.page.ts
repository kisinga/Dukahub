import { ChangeDetectionStrategy, Component, type OnInit } from '@angular/core';

@Component({
    standalone: true,
    imports: [],
    templateUrl: './main.page.html',
    styleUrl: './main.page.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainPage implements OnInit {

    ngOnInit(): void { }

}
