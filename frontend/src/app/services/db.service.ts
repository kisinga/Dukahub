import { Injectable, signal } from '@angular/core';
import PocketBase from 'pocketbase';
import { CompaniesRecord, CompaniesResponse, DailyFinancialsRecord, UsersRecord, UsersResponse } from '../../types/pocketbase-types';

@Injectable({
  providedIn: 'root'
})


export class DbService {
  private pb = new PocketBase('https://pantrify.azurewebsites.net');

  user = signal<UsersResponse | undefined>(undefined);
  companies = signal<CompaniesResponse[]>([]);
  selectedCompanyIndex = signal<number>(0);
  sales = signal<DailyFinancialsRecord[]>([]);


  constructor() {
    this.pb.authStore.onChange((auth) => {
      if (auth) {
        console.log('Authenticated');
        this.user.set(this.pb.authStore.model! as UsersResponse);
        this.setup();
      }
    }, true);
  }

  async fetchExpandUser(userID: string): Promise<UsersRecord> {
    return await this.pb.collection('users').getOne<UsersResponse<CompaniesRecord>>(userID, {
      expand: "company"
    });
  }

  setup() {
    this.fetchUserCompanies().then((company) => {
      // console.log("co", company);
      this.companies.set(company);
    })
  }

  changeSelectedCompany(index: number) {
    this.selectedCompanyIndex.set(index);
  }

  async login(email: string, password: string): Promise<boolean> {
    let result = (await this.pb.collection('users').authWithPassword(email, password, {
      expand: 'company'
    }))
    if (result === null) {
      return false;
    }
    return true;
  }

  logout(): void {
    this.pb.authStore.clear();
  }

  async fetchUserCompanies(): Promise<CompaniesResponse[]> {
    return await this.pb.collection('companies').getFullList<CompaniesResponse>()
  }

  // helper function exposing the built-in PocketBase function to generate URLs for files
  // since pb is private
  generateURL(record: {
    [key: string]: any;
  }, fileName: string): string {
    return this.pb.files.getUrl(record, fileName, { 'thumb': '100x250' });
  }

  async fetchSales(): Promise<DailyFinancialsRecord[]> {
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

    let sales = await this.pb.collection('daily_financials')
      .getFullList<DailyFinancialsRecord>(
        {
          filter: `created >= ${mondayUTC} AND created <= ${sundayUTC} &&
          company = ${this.user()!.company}
          `,
        }
      )

    return sales;
  }

}
