import { RecordFullListOptions } from "pocketbase";
import {
  AccountTypesResponse,
  CompanyAccountsResponse,
  ProductsResponse,
  SkusResponse
} from "./pocketbase-types";

export type OpenClose = "open" | "closed";

// ProductID: SKUID: Balance
export type ProductSKUBalances = {
  [key: string]: { [key: string]: number | null };
};

// AccountID: Balance
export type AccountBalances = { [key: string]: number | null };

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
  batch_op
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
  | { operation: DbOperation.batch_op; batchTypes: batchTypes, ids: string[] };

type createParams = BaseRecord | FormData
type updateParams<T> = { id: string; data: Partial<T> | FormData }

export type BatchOperation<T extends BaseRecord> =
  | {
    type: 'delete';
    ids: string[];
    returns: string[]; // Return deleted IDs
  }
  | {
    type: 'create';
    items: T[];
    returns: T[];
  }
  | {
    type: 'update';
    updates: Array<{ id: string; data: Partial<T> }>;
    returns: T[];
  };

export type PBRecordData<T extends Record<string, any>> = T | FormData;
