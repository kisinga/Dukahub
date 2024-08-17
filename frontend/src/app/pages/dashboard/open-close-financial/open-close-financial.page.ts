import { ChangeDetectionStrategy, Component, Inject, type OnInit } from '@angular/core';
import { TableColumn } from '../../../../types/main';
import { AppStateService } from '../../../services/app-state.service';
import { DbService } from '../../../services/db.service';
import { GenericTableComponent } from "../generic-table/generic-table.component";

@Component({
    standalone: true,
    imports: [GenericTableComponent],
    templateUrl: './open-close-financial.page.html',
    styleUrl: './open-close-financial.page.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenCloseFinancialPage implements OnInit {
    constructor(@Inject(AppStateService) private readonly stateService: AppStateService,
        @Inject(DbService) private readonly db: DbService,
    ) {

    }
    columns: TableColumn[] = [
        { key: 'account', label: 'Account', type: 'image' },
        { key: 'openingBal', label: 'Opening Balance', type: 'editable' },
        { key: 'closingBal', label: 'Closing Balance', type: 'editable' }
    ];

    data = [
        {
            id: 1,
            account: '/api/placeholder/32/32',
            accountName: 'Main Account',
            accountSubText: '1234-5678',
            openingBal: 1000,
            closingBal: 1500
        }, {
            id: 1,
            account: '/api/placeholder/32/32',
            accountName: 'Main Account',
            accountSubText: '1234-5678',
            openingBal: 1000,
            closingBal: 1500
        }, {
            id: 1,
            account: '/api/placeholder/32/32',
            accountName: 'Main Account',
            accountSubText: '1234-5678',
            openingBal: 1000,
            closingBal: 1500
        }, {
            id: 1,
            account: '/api/placeholder/32/32',
            accountName: 'Main Account',
            accountSubText: '1234-5678',
            openingBal: 1000,
            closingBal: 1500
        }, {
            id: 1,
            account: '/api/placeholder/32/32',
            accountName: 'Main Account',
            accountSubText: '1234-5678',
            openingBal: 1000,
            closingBal: 1500
        }, {
            id: 1,
            account: '/api/placeholder/32/32',
            accountName: 'Main Account',
            accountSubText: '1234-5678',
            openingBal: 1000,
            closingBal: 1500
        },
        // Add more data...
    ];
    onSave(updatedData: any[]): void {
        console.log('Saving:', updatedData);
        // Implement your save logic here
    }
    ngOnInit(): void { }

}
