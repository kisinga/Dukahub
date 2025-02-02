import { RecordFullListOptions } from "pocketbase";
import {
  AccountTypesResponse,
  Collections,
  CompanyAccountsResponse,
  ProductsResponse,
  SkusResponse
} from "./pocketbase-types";

// ProductID: SKUID: Balance
export type ProductSKUBalances = {
  [key: string]: { [key: string]: number | null };
};


export type MergedAccountWithType = CompanyAccountsResponse & {
  accountType: AccountTypesResponse;
};

export type MergedProductWithSKUs = ProductsResponse & {
  skusArray: SkusResponse[];
};

export enum DbOperation {
  list_search = 1,
  view,
  create,
  update,
  delete,
  batch_service
}

export type BaseRecord = Record<string, any>;

export enum batchTypes {
  create,
  update,
  delete,
  upsert
}

export type OperationParams<T extends BaseRecord> =
  | { operation: DbOperation.list_search; options?: RecordFullListOptions }
  | { operation: DbOperation.view; id: string }
  | { operation: DbOperation.create; createparams: createParams }
  | { operation: DbOperation.update; updateParams: updateParams<T> }
  | { operation: DbOperation.delete; id: string }
  | { operation: DbOperation.batch_service; };

type createParams = BaseRecord | FormData
type updateParams<T> = { id: string; data: Partial<T> | FormData }

// Types for individual batch operations.
export enum BatchOperationType {
  create,
  update,
  delete,
  upsert,
}

export interface BatchOpCreate<T extends BaseRecord> {
  collection: Collections;
  type: BatchOperationType.create;
  // You might accept FormData as well, if needed.
  data: T | FormData;
}

export interface BatchOpUpdate<T extends BaseRecord> {
  collection: Collections;
  type: BatchOperationType.update;
  id: string;
  data: Partial<T> | FormData;
}

export interface BatchOpDelete {
  collection: Collections;
  type: BatchOperationType.delete;
  id: string;
}

export interface BatchOpUpsert<T extends BaseRecord> {
  collection: Collections;
  type: BatchOperationType.upsert;
  // If id exists, perform update; otherwise, create.
  id?: string;
  data: Partial<T> | FormData;
}

export type BatchOp<T extends BaseRecord> =
  | BatchOpCreate<T>
  | BatchOpUpdate<T>
  | BatchOpDelete
  | BatchOpUpsert<T>;

// The BatchService class.

export type PBRecordData<T extends Record<string, any>> = T | FormData;
