import { ChangeDetectionStrategy, Component, type OnInit } from '@angular/core';

@Component({
    standalone: true,
    imports: [],
    templateUrl: './open-close-stock.page.html',
    styleUrl: './open-close-stock.page.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenCloseStockPage implements OnInit {

    ngOnInit(): void { }

}
