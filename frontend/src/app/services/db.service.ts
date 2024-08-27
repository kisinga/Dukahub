import { Injectable } from '@angular/core';
import PocketBase, { FileOptions, RecordFullListOptions } from 'pocketbase';
import { CompaniesRecord, DailyFinancialsRecord, DailyFinancialsResponse, TypedPocketBase, UsersResponse } from '../../types/pocketbase-types';

@Injectable({
  providedIn: 'root'
})


export class DbService {
  private pb = new PocketBase('https://pantrify.azurewebsites.net') as TypedPocketBase

  getAuthStore() {
    return this.pb.authStore
  }

  async fetchExpandUser(userID: string) {
    return await this.pb.collection('users').getOne<UsersResponse<CompaniesRecord>>(userID, {
      expand: "company"
    });
  }


  login(email: string, password: string) {
    return this.pb.collection('users').authWithPassword(email, password, {
      expand: 'company'
    })
  }

  logout(): void {
    this.pb.authStore.clear();
  }

  async fetchProducts(options?: RecordFullListOptions) {
    return await this.pb.collection('products').getFullList()
  }

  async fetchProduct(productID: string) {
    return await this.pb.collection('products').getOne(productID)
  }

  async createProduct(product: any) {
    return await this.pb.collection('products').create(product)
  }

  async updateProduct(productID: string, product: any) {
    return await this.pb.collection('products').update(productID, product)
  }

  async deleteProduct(productID: string) {
    return await this.pb.collection('products').delete(productID)
  }

  async fetchSkus(options?: RecordFullListOptions) {
    return await this.pb.collection('skus').getFullList(options)
  }

  async fetchDailyStocks(options?: RecordFullListOptions) {
    return await this.pb.collection('daily_stocks').getFullList(options)
  }

  async updateDailyStock(recordID: string, record: any) {
    return await this.pb.collection('daily_stocks').update(recordID, record)
  }

  async fetchDailyFinancialRecords(options?: RecordFullListOptions) {
    return await this.pb.collection('daily_financials').getFullList(options)
  }

  async updateDailyFinancialRecord(recordID: string, record: DailyFinancialsRecord) {
    // console.log('RecordID:', recordID, 'Record:', record);
    return await this.pb.collection('daily_financials').update(recordID, record)
  }

  async createDailyFinancialRecord(record: DailyFinancialsRecord) {
    return await this.pb.collection('daily_financials').create(record)
  }

  async fetchAccountTypes() {
    return await this.pb.collection('account_types').getFullList()
  }

  async fetchAccounts(options?: RecordFullListOptions) {
    return await this.pb.collection('accounts').getFullList(options)
  }

  async fetchUserCompanies() {
    return await this.pb.collection('companies').getFullList()
  }

  // helper function exposing the built-in PocketBase function to generate URLs for files
  // since pb is private
  generateURL(record: {
    [key: string]: any;
  }, filename: string, queryParams?: FileOptions): string {
    return this.pb.files.getUrl(record, filename, queryParams);
  }

  fetchWeeklySales(filter?: RecordFullListOptions) {
    return this.pb.collection('daily_financials')
      .getFullList<DailyFinancialsResponse>(
        filter
      )
  }
}
