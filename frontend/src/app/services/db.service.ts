import { Injectable, signal } from '@angular/core';
import PocketBase, { RecordFullListOptions } from 'pocketbase';
import { AccountNamesResponse, AccountsResponse, CompaniesRecord, CompaniesResponse, DailyFinancialsRecord, DailyFinancialsResponse, UsersRecord, UsersResponse } from '../../types/pocketbase-types';

@Injectable({
  providedIn: 'root'
})


export class DbService {
  private pb = new PocketBase('https://pantrify.azurewebsites.net');

  private user = signal<UsersResponse | undefined>(undefined);

  constructor() {
    this.pb.authStore.onChange((auth) => {
      if (auth) {
        console.log('Authenticated');
        this.user.set(this.pb.authStore.model! as UsersResponse);
      }
    }, true);
  }

  getUserSignal() {
    return this.user;
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

  fetchWeeklySales(filter?: RecordFullListOptions): Promise<DailyFinancialsResponse[]> {
    return this.pb.collection('daily_financials')
      .getFullList<DailyFinancialsResponse>(
        filter
      )
  }

}
