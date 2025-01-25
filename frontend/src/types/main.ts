import {
  AccountTypesResponse,
  AccountsResponse,
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

export type MergedAccountWithType = AccountsResponse & {
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