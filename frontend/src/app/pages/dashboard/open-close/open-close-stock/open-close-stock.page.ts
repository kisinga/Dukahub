import { ChangeDetectionStrategy, Component, type OnInit } from '@angular/core';
import { } from '../../../../../types/main';

@Component({
    standalone: true,
    imports: [],
    templateUrl: './open-close-stock.page.html',
    styleUrl: './open-close-stock.page.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenCloseStockPage implements OnInit {
    loadingStocks = true;

    ngOnInit(): void { }
    onSave(updatedData: any[]): void {
    }
}
