import { Injectable } from '@angular/core';
import PocketBase, { FileOptions, RecordFullListOptions } from 'pocketbase';
import { AccountNamesResponse, AccountsResponse, CompaniesRecord, CompaniesResponse, DailyFinancialsRecord, DailyFinancialsResponse, UsersRecord, UsersResponse } from '../../types/pocketbase-types';

@Injectable({
  providedIn: 'root'
})


export class DbService {
  private pb = new PocketBase('https://pantrify.azurewebsites.net');

  getAuthStore() {
    return this.pb.authStore
  }

  async fetchExpandUser(userID: string): Promise<UsersRecord> {
    return await this.pb.collection('users').getOne<UsersResponse<CompaniesRecord>>(userID, {
      expand: "company"
    });
  }


  login(email: string, password: string): Promise<any> {
    return this.pb.collection('users').authWithPassword(email, password, {
      expand: 'company'
    })
  }

  logout(): void {
    this.pb.authStore.clear();
  }

  async fetchFinancialRecords<T>(options?: RecordFullListOptions): Promise<T[]> {
    return await this.pb.collection('daily_financials').getFullList<T>(options)
  }

  async updateFinancialRecord(recordID: string, record: DailyFinancialsRecord): Promise<void> {
    // console.log('RecordID:', recordID, 'Record:', record);
    return await this.pb.collection('daily_financials').update(recordID, record)
  }

  async createFinancialRecord(record: DailyFinancialsRecord): Promise<void> {
    return await this.pb.collection('daily_financials').create(record)
  }

  async fetchAccountNames(): Promise<AccountNamesResponse[]> {
    return await this.pb.collection('account_names').getFullList<AccountNamesResponse>()
  }

  async fetchAccounts(options?: RecordFullListOptions): Promise<AccountsResponse[]> {
    return await this.pb.collection('accounts').getFullList<AccountsResponse>(options)
  }

  async fetchUserCompanies(): Promise<CompaniesResponse[]> {
    return await this.pb.collection('companies').getFullList<CompaniesResponse>()
  }

  // helper function exposing the built-in PocketBase function to generate URLs for files
  // since pb is private
  generateURL(record: {
    [key: string]: any;
  }, filename: string, queryParams?: FileOptions): string {
    return this.pb.files.getUrl(record, filename, queryParams);
  }

  fetchWeeklySales(filter?: RecordFullListOptions): Promise<DailyFinancialsResponse[]> {
    return this.pb.collection('daily_financials')
      .getFullList<DailyFinancialsResponse>(
        filter
      )
  }
}
