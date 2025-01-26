import { Injectable } from "@angular/core";
import PocketBase, { FileOptions, RecordFullListOptions } from "pocketbase";
import { BaseRecord, DbOperation, OperationParams } from "../../types/main";
import {
  Collections,
  DailyFinancialsResponse,
  TypedPocketBase
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

  async toggleDayOperationState(data: any) {
    return this.pb.send("/daily_financials", data);
  }

  login(email: string, password: string) {
    return this.pb.collection(Collections.Admins).authWithPassword(email, password, {
      expand: "company",
    });
  }

  logout(): void {
    this.pb.authStore.clear();
  }

  async execute<T extends BaseRecord>(
    collection: Collections,
    params: OperationParams<T>
  ): Promise<T | T[]> {
    switch (params.operation) {
      case DbOperation.list_search:
        const records = await this.pb.collection(collection)
          .getFullList<T>(params.options);
        return records;

      case DbOperation.view:
        const singleRecord = await this.pb.collection(collection)
          .getOne<T>(params.id);
        return singleRecord;

      case DbOperation.create:
        // Handle FormData and regular objects differently
        const createData = params.createparams instanceof FormData
          ? params.createparams
          : params.createparams as T;
        const newRecord = await this.pb.collection(collection)
          .create<T>(createData);
        return newRecord;

      case DbOperation.update:
        const updatedRecord = await this.pb.collection(collection)
          .update<T>(params.updateParams.id, params.updateParams.data);
        return updatedRecord;

      case DbOperation.delete:
        await this.pb.collection(collection)
          .delete(params.id);
        return [];

      case DbOperation.batch_op:
        throw new Error("Not fully implemented")

      // // Validate batch parameters
      // if (!Array.isArray(params.ids)) {
      //   throw new Error('Batch operation requires array of IDs');
      // }

      // // Explicit type annotation for IDs
      // const stringIds = params.ids.filter((id: unknown): id is string =>
      //   typeof id === 'string'
      // );

      // if (stringIds.length !== params.ids.length) {
      //   return { error: new Error('All batch IDs must be strings') };
      // }

      // // Handle different batch types
      // switch (params.batchTypes) {
      //   case batchTypes.delete:
      //     const deleteResults = await Promise.all(
      //       stringIds.map(async (id: string) => {
      //         await this.pb.collection(collection).delete(id);
      //         return id;
      //       })
      //     );
      //     // return { data: deleteResults as T[] };
      //     throw new Error("Not fully implemented")

      //   case batchTypes.update:
      //     throw new Error("Not fully implemented")

      //   if (!params.data) {
      //     return { error: new Error('Batch update requires data') };
      //   }
      //   const updateResults = await Promise.all(
      //     stringIds.map(async (id: string) => {
      //       return this.pb.collection(collection).update<T>(id, params.data!);
      //     })
      //   );
      //   return { data: updateResults };

      // default:
      //   return { error: new Error('Unsupported batch operation type') };
      // }
      default:
        throw new Error('Invalid operation');
    }

  }


  // async fetchProducts(options?: RecordFullListOptions) {
  //   return await this.pb.collection("products").getFullList(options);
  // }

  // async fetchProduct(productID: string) {
  //   return await this.pb.collection("products").getOne(productID);
  // }

  // async createProduct(product: any) {
  //   return await this.pb.collection("products").create(product);
  // }

  // async updateProduct(productID: string, product: any) {
  //   return await this.pb.collection("products").update(productID, product);
  // }

  // async deleteProduct(productID: string) {
  //   return await this.pb.collection("products").delete(productID);
  // }

  // async fetchSkus(options?: RecordFullListOptions) {
  //   return await this.pb.collection("skus").getFullList(options);
  // }

  // async fetchDailyStocks(options?: RecordFullListOptions) {
  //   return await this.pb.collection("daily_stocks").getFullList(options);
  // }

  // async updateDailyStock(recordID: string, record: any) {
  //   return await this.pb.collection("daily_stocks").update(recordID, record);
  // }

  // async fetchDailyFinancialRecords(options?: RecordFullListOptions) {
  //   return await this.pb.collection("daily_financials").getFullList(options);
  // }

  // async updateDailyFinancialRecord(
  //   recordID: string,
  //   record: DailyFinancialsRecord,
  // ) {
  //   // console.log('RecordID:', recordID, 'Record:', record);
  //   return await this.pb
  //     .collection("daily_financials")
  //     .update(recordID, record);
  // }

  // async createDailyFinancialRecord(record: DailyFinancialsRecord) {
  //   return await this.pb.collection("daily_financials").create(record);
  // }

  // async fetchAccountTypes() {
  //   return await this.pb.collection("account_types").getFullList();
  // }

  // async fetchAccounts(options?: RecordFullListOptions) {
  //   return await this.pb.collection("accounts").getFullList(options);
  // }

  // async fetchUserCompanies() {
  //   return await this.pb.collection("companies").getFullList();
  // }

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
