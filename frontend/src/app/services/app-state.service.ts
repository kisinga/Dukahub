import { computed, effect, Inject, Injectable, signal } from '@angular/core';
import { MergedAccountWithType } from '../../types/main';
import { AccountsResponse, AccountTypesResponse, CompaniesResponse, DailyFinancialsResponse, UsersResponse } from '../../types/pocketbase-types';
import { DbService } from './db.service';
import { DynamicUrlService } from './dynamic-url.service';

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  private allGeneralAccountNames = signal<AccountTypesResponse[]>([]);
  private allPlainCompanyAccounts = signal<AccountsResponse[]>([]);
  private allMergedCompanyAccounts = computed<MergedAccountWithType[]>(() => {
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
  selectedCompanyAccounts = computed(() => {
    return this.allMergedCompanyAccounts().filter(account => account.company === this.userCompanies()[this.selectedCompanyIndex()].id)
  });

  userCompanies = signal<CompaniesResponse[]>([]);
  selectedCompanyIndex = signal<number>(-1);

  selectedCompany = computed(() => {
    if (this.selectedCompanyIndex() > -1) {
      return this.userCompanies()[this.selectedCompanyIndex()];
    } else {
      return undefined;
    }
  })
  urlCompany = signal<string>("");


  weeklySales = signal<DailyFinancialsResponse[]>([]);
  user = signal<UsersResponse | undefined>(undefined);
  loadingUser = signal<boolean>(true);

  selectedDate = signal<Date>(new Date())

  readonly isAuthenticated = computed(() => !!this.user());

  constructor(
    @Inject(DbService) private readonly db: DbService,
    @Inject(DynamicUrlService) private readonly dynamicUrlService: DynamicUrlService
  ) {
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

        let queryOptions = {
          filter: `company = "${this.selectedCompany()?.id}"`
        }

        this.db.fetchAccounts(queryOptions).then((accounts) => {
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
      this.userCompanies.set(company);
      if (this.user()) {
        if (this.urlCompany() !== "") {
          // make sure the company exists in the list of companies
          let co = company.find(c => c.id === this.urlCompany());
          if (co) {
            this.selectedCompanyIndex.set(company.findIndex(c => c.id === this.urlCompany()));
          } else {
            console.log('provided Company not found');
            this.selectedCompanyIndex.set(company.findIndex(c => c.id === this.user()!!.defaultCompany));
          }
        } else {
          this.selectedCompanyIndex.set(company.findIndex(c => c.id === this.user()!!.defaultCompany));
        }
      }
    })
    this.db.fetchAccountTypes().then((accountNames) => {
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
