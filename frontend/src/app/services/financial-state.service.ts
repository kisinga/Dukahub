import { computed, effect, Inject, Injectable, signal } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { FinancialTableData } from '../../types/main';
import { AccountsResponse } from '../../types/pocketbase-types';
import { AppStateService } from './app-state.service';
import { DbService } from './db.service';

@Injectable({
  providedIn: 'root'
})
export class FiancialStateService {
  savingFinancials = signal<boolean>(false);

  selectedCompanyName = '';

  accounts = computed<(AccountsResponse & {
    iconURL: string;
    parentName: string;
  })[]>(() => {
    return this.stateService.accounts().map(account => {
      let relatedAccount = this.stateService.accountNames().find(id => id.id === account.type)!!
      // console.log('RelatedAccount:', relatedAccount);
      return {
        ...account,
        parentName: relatedAccount.name,
        iconURL: this.db.generateURL(relatedAccount, relatedAccount.icons[account.icon_id])
      }
    })
  });

  financialTableData = signal<FinancialTableData[]>([]);

  shouldFetchData = computed(() =>
    this.stateService.companies().length > 0 &&
    this.stateService.selectedDate() != null &&
    this.stateService.selectedCompanyIndex() >= 0
  );

  fetchFinancialData() {
    return this.db.fetchFinancialRecords(
      this.stateService.companies()[this.stateService.selectedCompanyIndex()].id,
      this.stateService.selectedDate()
    )
  }

  private loadingObservable: ReplaySubject<boolean> = new ReplaySubject(1);
  loadingFinancials = signal<boolean>(false);

  constructor(@Inject(AppStateService) private readonly stateService: AppStateService,
    @Inject(DbService) private readonly db: DbService) {

    effect(async () => {
      if (this.shouldFetchData()) {
        let financialData = await this.fetchFinancialData();
        const updatedData = this.accounts().map(account => {
          let record = financialData.find(d => d.account === account.id);
          let data: FinancialTableData = {
            id: account.id,
            existingRecordID: record?.id || "",
            account: account.iconURL,
            accountName: account.name,
            accountSubText: account.account_number,
            openingBal: record?.opening_bal ?? 0,
            closingBal: record?.closing_bal ?? 0
          };
          return data;
        });
        this.financialTableData.set(updatedData);
        this.loadingObservable.next(false);
      }
    });

  }

  updateRecords(existingRecords: FinancialTableData[]) {
    return Promise.all(existingRecords.map(record => {
      return this.db.updateFinancialRecord(record.existingRecordID!!, {
        opening_bal: record.openingBal,
        closing_bal: record.closingBal,
        account: record.id,
        date: this.stateService.selectedDate().toISOString(),
        company: this.stateService.companies()[this.stateService.selectedCompanyIndex()].id,
        notes: "",
        user: this.stateService.user()!!.id
      })
    })
    )

  }

  createRecords(newRecords: FinancialTableData[]) {
    return Promise.all(newRecords.map(record => {
      return this.db.createFinancialRecord({
        opening_bal: record.openingBal,
        closing_bal: record.closingBal,
        account: record.id,
        date: this.stateService.selectedDate().toISOString(),
        company: this.stateService.companies()[this.stateService.selectedCompanyIndex()].id,
        notes: "",
        user: this.stateService.user()!!.id
      })
    })
    )
  }

}
