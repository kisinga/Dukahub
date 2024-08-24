import { effect, Inject, Injectable } from '@angular/core';
import { FinancialTableData, TableColumn } from '../../../../../types/main';
import { AccountsResponse } from '../../../../../types/pocketbase-types';
import { AppStateService } from '../../../../services/app-state.service';
import { DbService } from '../../../../services/db.service';


@Injectable({
  providedIn: 'root'
})
export class LocalStateService {
  loadingFinancials = true;
  financialTableData: FinancialTableData[] = [];


  selectedCompanyName = '';
  accounts: (AccountsResponse & {
    iconURL: string;
    parentName: string;
  })[] = [];

  columns: TableColumn[] = [
    { key: 'account', label: `Accounts`, type: 'image' },
    { key: 'openingBal', label: 'Opening Bal', type: 'editable' },
    { key: 'closingBal', label: 'Closing Bal', type: 'editable' }
  ];

  constructor(@Inject(AppStateService) private readonly stateService: AppStateService,
    @Inject(DbService) private readonly db: DbService,) {

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
        if (this.stateService.companies().length > 0 && this.stateService.selectedDate() && this.stateService.selectedCompanyIndex() >= 0) {
          this.loadingFinancials = true

          this.db.fetchFinancialRecords(
            this.stateService.companies()[this.stateService.selectedCompanyIndex()].id,
            this.stateService.selectedDate()).then((dailyFinancials) => {
              console.log('DailyFinancials:', dailyFinancials);
              this.financialTableData = this.accounts.map(account => {
                let record = dailyFinancials.find(d => d.account === account.id)
                return {
                  id: account.id,
                  existingRecordID: record?.id || "",
                  account: account.iconURL,
                  accountName: account.name,
                  accountSubText: account.account_number,
                  openingBal: record?.opening_bal ?? 0,
                  closingBal: record?.closing_bal ?? 0
                }
              })
              // console.log('FinancialTableData:', this.financialTableData);
              this.loadingFinancials = false
            })
        }
      }

    })
  }

  updateRecords(existingRecords: FinancialTableData[]) {
    existingRecords.forEach(record => {
      this.db.updateFinancialRecord(record.existingRecordID!!, {
        opening_bal: record.openingBal,
        closing_bal: record.closingBal,
        account: record.id,
        date: this.stateService.selectedDate().toISOString(),
        company: this.stateService.companies()[this.stateService.selectedCompanyIndex()].id,
        notes: "",
        user: this.stateService.user()!!.id
      })
    })

  }

  createRecords(newRecords: FinancialTableData[]) {
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
  }

}
