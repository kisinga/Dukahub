import { ChangeDetectionStrategy, Component, type OnInit } from '@angular/core';
import { FinancialTableData, TableColumn } from '../../../../../types/main';
import { OpenCloseTableComponent } from '../../open-close-table/open-close-table.component';

@Component({
    standalone: true,
    imports: [OpenCloseTableComponent],
    templateUrl: './open-close-stock.page.html',
    styleUrl: './open-close-stock.page.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenCloseStockPage implements OnInit {
    loadingStocks = true;
    financialTableData: FinancialTableData[] = [];
    columns: TableColumn[] = [
        { key: 'account', label: `Accounts`, type: 'image' },
        { key: 'openingBal', label: 'Opening Bal', type: 'editable' },
        { key: 'closingBal', label: 'Closing Bal', type: 'editable' }
    ];
    ngOnInit(): void { }
    onSave(updatedData: any[]): void {
    }
}
