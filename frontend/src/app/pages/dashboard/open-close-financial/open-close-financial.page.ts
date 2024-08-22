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
    accounts: (AccountsResponse & {
        iconURL: string;
        parentName: string;
    })[] = [];
    constructor(@Inject(AppStateService) private readonly stateService: AppStateService,
        @Inject(DbService) private readonly db: DbService,
        @Inject(TruncatePipe) private readonly truncatePipe: TruncatePipe,
        private cdr: ChangeDetectorRef
    ) {

        effect(() => {
            if (this.stateService.accountNames().length > 0) {
                this.accounts = this.stateService.accounts().map(account => {
                    let relatedAccount = this.stateService.accountNames().find(id => id.id === account.type)!!
                    // console.log('RelatedAccount:', relatedAccount);
                    return {
                        ...account,
                        parentName: relatedAccount.name,
                        iconURL: this.db.generateURL(relatedAccount, relatedAccount.icons[account.icon_id])
                    }
                })
                // console.log('Accounts:', accounts);

                // check if the database has data for the selected date

                this.db.fetchFinancialRecords(
                    this.stateService.companies()[this.stateService.selectedCompanyIndex()].id,
                    this.stateService.selectedDate()).then((dailyFinancials) => {
                        console.log('DailyFinancials:', dailyFinancials);
                        this.financialTableData = this.accounts.map(account => {
                            let record = dailyFinancials.find(d => d.account === account.id)
                            return {
                                id: account.id,
                                account: account.iconURL,
                                accountName: account.name,
                                accountSubText: account.account_number,
                                openingBal: record?.opening_bal ?? 0,
                                closingBal: record?.closing_bal ?? 0
                            }
                        })
                        console.log('FinancialTableData:', this.financialTableData);
                        this.cdr.detectChanges(); // Trigger change detection
                    })
            }

        })
    }
    columns: TableColumn[] = [
        { key: 'account', label: `Accounts`, type: 'image' },
        { key: 'openingBal', label: 'Opening Bal', type: 'editable' },
        { key: 'closingBal', label: 'Closing Bal', type: 'editable' }
    ];



    onSave(updatedData: any[]): void {
        let data: FinancialTableData[] = updatedData;
        // let mappedData:
        //     data.forEach(d => {
        //         data.
        // })
        console.log('Saving:', updatedData);
        // Implement your save logic here
    }
    ngOnInit(): void { }

}
