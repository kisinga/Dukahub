import {
  AccountTypesResponse,
  AccountsResponse,
  DailyFinancialsResponse,
  DailyStocksResponse,
  ProductsResponse,
  SkusResponse,
} from "./pocketbase-types";

export type OpenClose = "open" | "closed";

// ProductID: SKUID: Balance
export type ProductSKUBalances = {
  [key: string]: { [key: string]: number | null };
};

// AccountID: Balance
type AccountBalances = { [key: string]: number | null };

export type MergedAccountWithType = AccountsResponse & {
  accountType: AccountTypesResponse;
};
export type MergedDailyFInancialWithAccount = DailyFinancialsResponse & {
  relatedMergedAccountWithType: MergedAccountWithType;
};

export type MergedProductWithSKUs = ProductsResponse & {
  skusArray: SkusResponse[];
};
