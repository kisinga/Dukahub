import { Injectable } from "@angular/core";
import PocketBase, { FileOptions, RecordFullListOptions } from "pocketbase";
import { DbOperation } from "../../types/main";
import {
  Collections,
  CompaniesRecord,
  DailyFinancialsRecord,
  DailyFinancialsResponse,
  TypedPocketBase,
  UsersResponse,
} from "../../types/pocketbase-types";

@Injectable({
  providedIn: "root",
})
export class DbService {
  private pb = new PocketBase(
    "http://127.0.0.1:8090",
  ) as TypedPocketBase;

  getAuthStore() {
    return this.pb.authStore;
  }

  async fetchExpandUser(userID: string) {
    return await this.pb
      .collection("users")
      .getOne<UsersResponse<CompaniesRecord>>(userID, {
        expand: "company",
      });
  }

  async toggleDayOperationState(data: any) {
    return this.pb.send("/daily_financials", data);
  }

  login(email: string, password: string) {
    return this.pb.collection("admins").authWithPassword(email, password, {
      expand: "company",
    });
  }

  logout(): void {
    this.pb.authStore.clear();
  }

  perform<T>(operation: DbOperation, collection: Collections, bodyParams?: { [key: string]: any; } | FormData, options?: RecordFullListOptions): Promise<T> | Promise<Array<T>> | Promise<boolean> | Error {
    switch (operation) {
      case DbOperation.list_search:
        return this.pb.collection(collection).getFullList<T>(options);

      case DbOperation.view:
        if (!bodyParams) return new Error("Missing record ID");
        const viewId = bodyParams instanceof FormData
          ? bodyParams.get('id')?.toString()
          : bodyParams?.["id"];
        if (!viewId) return new Error("Missing record ID");
        return this.pb.collection(collection).getOne<T>(viewId);

      case DbOperation.create:
        if (!bodyParams) return new Error("Missing creation data");
        return this.pb.collection(collection).create<T>(bodyParams);

      case DbOperation.update:
        if (!bodyParams) return new Error("Missing update data");
        let updateId: string;
        let updateData: any;
        if (bodyParams instanceof FormData) {
          updateId = bodyParams.get('id')?.toString() || '';
          bodyParams.delete('id');
          updateData = bodyParams;
        } else {
          const { id, ...rest } = bodyParams;
          updateId = id;
          updateData = rest;
        }
        if (!updateId) return new Error("Missing record ID");
        return this.pb.collection(collection).update<T>(updateId, updateData);

      case DbOperation.delete:
        if (!bodyParams) return new Error("Missing record ID");
        const deleteId = bodyParams instanceof FormData
          ? bodyParams.get('id')?.toString()
          : bodyParams?.["id"];
        if (!deleteId) return new Error("Missing record ID");
        return this.pb.collection(collection).delete(deleteId);

      case DbOperation.batch_op:
        return new Error("Batch operations not implemented");

      default:
        return new Error("Invalid operation");
    }
  }

  async fetchProducts(options?: RecordFullListOptions) {
    return await this.pb.collection("products").getFullList(options);
  }

  async fetchProduct(productID: string) {
    return await this.pb.collection("products").getOne(productID);
  }

  async createProduct(product: any) {
    return await this.pb.collection("products").create(product);
  }

  async updateProduct(productID: string, product: any) {
    return await this.pb.collection("products").update(productID, product);
  }

  async deleteProduct(productID: string) {
    return await this.pb.collection("products").delete(productID);
  }

  async fetchSkus(options?: RecordFullListOptions) {
    return await this.pb.collection("skus").getFullList(options);
  }

  async fetchDailyStocks(options?: RecordFullListOptions) {
    return await this.pb.collection("daily_stocks").getFullList(options);
  }

  async updateDailyStock(recordID: string, record: any) {
    return await this.pb.collection("daily_stocks").update(recordID, record);
  }

  async fetchDailyFinancialRecords(options?: RecordFullListOptions) {
    return await this.pb.collection("daily_financials").getFullList(options);
  }

  async updateDailyFinancialRecord(
    recordID: string,
    record: DailyFinancialsRecord,
  ) {
    // console.log('RecordID:', recordID, 'Record:', record);
    return await this.pb
      .collection("daily_financials")
      .update(recordID, record);
  }

  async createDailyFinancialRecord(record: DailyFinancialsRecord) {
    return await this.pb.collection("daily_financials").create(record);
  }

  async fetchAccountTypes() {
    return await this.pb.collection("account_types").getFullList();
  }

  async fetchAccounts(options?: RecordFullListOptions) {
    return await this.pb.collection("accounts").getFullList(options);
  }

  async fetchUserCompanies() {
    return await this.pb.collection("companies").getFullList();
  }

  // helper function exposing the built-in PocketBase function to generate URLs for files
  // since pb is private
  generateURL(
    record: {
      [key: string]: any;
    },
    filename: string,
    queryParams?: FileOptions,
  ): string {
    return this.pb.files.getUrl(record, filename, queryParams);
  }

  fetchWeeklySales(filter?: RecordFullListOptions) {
    return this.pb
      .collection("daily_financials")
      .getFullList<DailyFinancialsResponse>(filter);
  }
}
