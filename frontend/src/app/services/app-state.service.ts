import { computed, effect, Inject, Injectable, signal } from '@angular/core';
import { MergedAccountWithType } from '../../types/main';
import { AccountNamesResponse, AccountsResponse, CompaniesResponse, DailyFinancialsResponse, UsersResponse } from '../../types/pocketbase-types';
import { DbService } from './db.service';

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  allGeneralAccountNames = signal<AccountNamesResponse[]>([]);
  companies = signal<CompaniesResponse[]>([]);
  private allPlainCompanyAccounts = signal<AccountsResponse[]>([]);

  allMergedCompanyAccounts = computed<MergedAccountWithType[]>(() => {
    return this.allPlainCompanyAccounts().map(account => {
      let relatedAccount = this.allGeneralAccountNames().find(name => name.id === account.type);

      if (!relatedAccount) {
        throw new Error(`Account not found for record ${account.id}`)
      }
      return {
        ...account,
        accountType: relatedAccount
      }
    })
  });

  selectedCompanyIndex = signal<number>(-1);

  selectedCompany = computed(() => {
    if (this.selectedCompanyIndex() > -1) {
      return this.companies()[this.selectedCompanyIndex()];
    } else {
      return undefined;
    }
  })

  selectedCompanyAccounts = computed(() => {
    return this.allMergedCompanyAccounts().filter(account => account.company === this.companies()[this.selectedCompanyIndex()].id)
  });


  weeklySales = signal<DailyFinancialsResponse[]>([]);

  user = signal<UsersResponse | undefined>(undefined);
  loadingUser = signal<boolean>(true);

  selectedDate = signal<Date>(new Date())

  readonly isAuthenticated = computed(() => !!this.user());

  constructor(@Inject(DbService) private readonly db: DbService) {
    effect(() => {
      if (this.isAuthenticated()) {
        this.setup();
      }
    });
    effect(() => {
      if (this.selectedCompany()) {
        this.fetchWeeklySales(this.selectedCompany()?.id!!).then((weeklySales) => {
          this.weeklySales.set(weeklySales)
        });

        this.db.fetchAccounts().then((accounts) => {
          this.allPlainCompanyAccounts.set(accounts);
        })
      }
    });

  }

  setUser(user: UsersResponse) {
    this.user.set(user);
    this.loadingUser.set(false);
  }

  setup() {
    console.log('Setting up');
    this.db.fetchUserCompanies().then((company) => {
      this.companies.set(company);
      if (this.user()) {
        this.selectedCompanyIndex.set(company.findIndex(c => c.id === this.user()!!.defaultCompany));
      }
    })
    this.db.fetchAccountNames().then((accountNames) => {
      this.allGeneralAccountNames.set(accountNames);
    })

  }


  async changeSelectedCompany(index: number) {
    this.selectedCompanyIndex.set(index);
  }

  async fetchWeeklySales(companyID: string): Promise<DailyFinancialsResponse[]> {
    // use the date today to fetch independent sales arrays for the week
    // the week starts on a Monday
    let today = new Date();
    let day = today.getDay();
    let diff = today.getDate() - day + (day == 0 ? -6 : 1);
    let mondayUTC = new Date(today.setDate(diff)).toISOString();
    let sundayUTC = new Date(today.setDate(diff + 6)).toISOString();
    // console.log('mondayUTC', mondayUTC);
    // console.log('sundayUTC', sundayUTC);
    let options = {
      filter: `created >= "${mondayUTC}" 
      && created <= "${sundayUTC}"
      && company = "${companyID}"`,
    }
    let sales = await this.db.fetchWeeklySales(options);

    return sales;
  }

}
