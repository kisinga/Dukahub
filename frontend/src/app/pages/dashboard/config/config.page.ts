import { ChangeDetectionStrategy, Component, type OnInit } from '@angular/core';

@Component({
    standalone: true,
    imports: [],
    templateUrl: './config.page.html',
    styleUrl: './config.page.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigPage implements OnInit {

    ngOnInit(): void { }

}
