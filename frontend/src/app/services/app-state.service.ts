import { computed, effect, Inject, Injectable, signal } from '@angular/core';
import { DbService } from './db.service';
import { CompaniesResponse, AccountsResponse, AccountNamesResponse, DailyFinancialsResponse, UsersResponse } from '../../types/pocketbase-types';

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  companies = signal<CompaniesResponse[]>([]);
  accounts = signal<AccountsResponse[]>([]);
  accountNames = signal<AccountNamesResponse[]>([]);

  selectedCompanyIndex = signal<number>(0);
  weeklySales = signal<DailyFinancialsResponse[]>([]);

  user = signal<UsersResponse | undefined>(undefined);
  loadingUser = signal<boolean>(true);

  readonly isAuthenticated = computed(() => !!this.user());

  constructor(@Inject(DbService) private readonly db: DbService) {

  }

  setUser(user: UsersResponse) {
    this.user.set(user);
    this.loadingUser.set(false);
    this.setup()
  }

  setup() {
    console.log('Setting up');
    this.db.fetchUserCompanies().then(async (company) => {
      console.log("co", company);
      this.companies.set(company);

      let weeklySales = await this.fetchWeeklySales()
      this.weeklySales.set(weeklySales)
    })
  }

  changeSelectedCompany(index: number) {
    this.selectedCompanyIndex.set(index);
  }

  async fetchWeeklySales(): Promise<DailyFinancialsResponse[]> {
    if (!this.user()?.company) {
      console.error('No company found');
      return [];
    }
    // use the date today to fetch independent sales arrays for the week
    // the week starts on a Monday
    let today = new Date();
    let day = today.getDay();
    let diff = today.getDate() - day + (day == 0 ? -6 : 1);
    let mondayUTC = new Date(today.setDate(diff)).toISOString();
    let sundayUTC = new Date(today.setDate(diff + 6)).toISOString();
    console.log('mondayUTC', mondayUTC);
    console.log('sundayUTC', sundayUTC);
    let options = {
      filter: `created >= "${mondayUTC}" 
      && created <= "${sundayUTC}"
      && company = "${this.companies()[this.selectedCompanyIndex()].id}"`,
    }
    let sales = await this.db.fetchWeeklySales(options);

    return sales;
  }

}
