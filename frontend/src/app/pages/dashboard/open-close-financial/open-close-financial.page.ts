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
                                existingRecordID: record?.id,
                                accountIconURL: account.iconURL,
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
        { key: 'accountIconURL', label: `Accounts`, type: 'image' },
        { key: 'openingBal', label: 'Opening Bal', type: 'editable' },
        { key: 'closingBal', label: 'Closing Bal', type: 'editable' }
    ];



    onSave(updatedData: any[]): void {
        let data: FinancialTableData[] = updatedData.map(d => {
            let newData: FinancialTableData = d as FinancialTableData
            newData.openingBal = parseFloat(newData.openingBal.toString())
            newData.closingBal = parseFloat(newData.closingBal.toString())
            return newData
        });
        // aggregate all the changes made to existing records by filtering out records with existingRecordID
        let updatedRecords = data.filter(d => d.existingRecordID)

        // aggregate all the new records by filtering out records without existingRecordID
        let newRecords = data.filter(d => !d.existingRecordID)

        // update the existing records
        updatedRecords.forEach(record => {
            this.db.updateFinancialRecord(record.existingRecordID!!, {
                opening_bal: record.openingBal,
                closing_bal: record.closingBal,
                account: record.id,
                date: this.stateService.selectedDate().toISOString(),
                company: this.stateService.companies()[this.stateService.selectedCompanyIndex()].id,
                notes: "",
                user: this.stateService.user()!!.id
            }
            )
        })

        // create new records for records without existingRecordID
        newRecords.forEach(record => {
            this.db.createFinancialRecord({
                opening_bal: record.openingBal,
                closing_bal: record.closingBal,
                account: record.id,
                date: this.stateService.selectedDate().toISOString(),
                company: this.stateService.companies()[this.stateService.selectedCompanyIndex()].id,
                notes: "",
                user: this.stateService.user()!!.id
            })
        })

        console.log('Saving:', updatedData);
        // Implement your save logic here
    }

    ngOnInit(): void { }

}
