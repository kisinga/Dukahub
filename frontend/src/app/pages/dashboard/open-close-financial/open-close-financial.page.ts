import { ChangeDetectionStrategy, ChangeDetectorRef, Component, effect, Inject, type OnInit } from '@angular/core';
import { FinancialTableData, TableColumn } from '../../../../types/main';
import { AccountsResponse } from '../../../../types/pocketbase-types';
import { TruncatePipe } from '../../../pipes/truncate.pipe';
import { AppStateService } from '../../../services/app-state.service';
import { DbService } from '../../../services/db.service';
import { OpenCloseTableComponent } from '../open-close-table/open-close-table.component';

@Component({
    standalone: true,
    imports: [OpenCloseTableComponent],
    templateUrl: './open-close-financial.page.html',
    styleUrl: './open-close-financial.page.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})

export class OpenCloseFinancialPage implements OnInit {
    financialTableData: FinancialTableData[] = [];
    selectedCompanyName = '';

    constructor(@Inject(AppStateService) private readonly stateService: AppStateService,
        @Inject(DbService) private readonly db: DbService,
        @Inject(TruncatePipe) private readonly truncatePipe: TruncatePipe,
        private cdr: ChangeDetectorRef
    ) {

        effect(() => {
            if (this.stateService.accountNames().length > 0) {
                // console.log('AccountNames:', this.stateService.accountNames());
                // console.log('Accounts:', this.stateService.accounts());
                let accounts: (AccountsResponse & {
                    iconURL: string;
                    parentName: string;
                })[] = this.stateService.accounts().map(account => {
                    let relatedAccount = this.stateService.accountNames().find(id => id.id === account.type)!!
                    // console.log('RelatedAccount:', relatedAccount);
                    return {
                        ...account,
                        parentName: relatedAccount.name,
                        iconURL: this.db.generateURL(relatedAccount, relatedAccount.icons[account.icon_id])
                    }
                })
                console.log('Accounts:', accounts);

                this.financialTableData = accounts.map(account => {
                    return {
                        id: account.id,
                        account: account.iconURL,
                        accountName: account.name,
                        accountSubText: account.account_number,
                        openingBal: 0,
                        closingBal: 0
                    }
                })
                this.cdr.detectChanges(); // Trigger change detection
            }

        })
    }
    columns: TableColumn[] = [
        { key: 'account', label: `Accounts`, type: 'image' },
        { key: 'openingBal', label: 'Opening Bal', type: 'editable' },
        { key: 'closingBal', label: 'Closing Bal', type: 'editable' }
    ];



    onSave(updatedData: any[]): void {
        console.log('Saving:', updatedData);
        // Implement your save logic here
    }
    ngOnInit(): void { }

}
