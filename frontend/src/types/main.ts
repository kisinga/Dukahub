import {
  AccountTypesResponse,
  AccountsResponse,
  DailyFinancialsResponse,
  DailyStocksResponse,
  ProductsResponse,
  SkusResponse,
} from "./pocketbase-types";

export type OpenClose = "open" | "closed";
export type MergedAccountWithType = AccountsResponse & {
  accountType: AccountTypesResponse;
};
export type MergedDailyFInancialWithAccount = DailyFinancialsResponse & {
  relatedMergedAccountWithType: MergedAccountWithType;
};

export type MergedProductWithSKUs = ProductsResponse & {
  skusArray: SkusResponse[];
};
export type MergedDailyProductWithSKU = DailyStocksResponse & {
  relatedMergedProductWithSKUs: MergedProductWithSKUs;
};
