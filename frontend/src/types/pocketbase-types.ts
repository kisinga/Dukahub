/**
 * This file was @generated using pocketbase-typegen
 */

import type PocketBase from "pocketbase";
import type { RecordService } from "pocketbase";

export enum Collections {
  AccountTypes = "account_types",
  Accounts = "accounts",
  Companies = "companies",
  DailyFinancials = "daily_financials",
  DailyOpenClose = "daily_open_close",
  DailyStocks = "daily_stocks",
  Expenses = "expenses",
  Invoices = "invoices",
  Partners = "partners",
  Products = "products",
  Purchases = "purchases",
  Sales = "sales",
  Skus = "skus",
  Transactions = "transactions",
  Users = "users",
}

// Alias types for improved usability
export type IsoDateString = string;
export type RecordIdString = string;
export type HTMLString = string;

// System fields
export type BaseSystemFields<T = never> = {
  id: RecordIdString;
  created: IsoDateString;
  updated: IsoDateString;
  collectionId: string;
  collectionName: Collections;
  expand?: T;
};

export type AuthSystemFields<T = never> = {
  email: string;
  emailVisibility: boolean;
  username: string;
  verified: boolean;
} & BaseSystemFields<T>;

// Record types for each collection

export type AccountTypesRecord = {
  icons: string[];
  name: string;
};

export type AccountsRecord = {
  account_number?: string;
  bal?: number;
  company: RecordIdString;
  icon_id?: number;
  name?: string;
  type: RecordIdString;
};

export type CompaniesRecord = {
  location?: string;
  logo?: string;
  name?: string;
  phone?: string;
};

export type DailyFinancialsRecord = {
  account: RecordIdString;
  closing_bal?: number;
  company: RecordIdString;
  date: IsoDateString;
  notes?: HTMLString;
  opening_bal?: number;
  user: RecordIdString;
};

export enum DailyOpenCloseStatusOptions {
  "open" = "open",
  "closed" = "closed",
}
export type DailyOpenCloseRecord = {
  close_time: IsoDateString;
  date?: IsoDateString;
  open_time: IsoDateString;
  status: DailyOpenCloseStatusOptions;
  user?: RecordIdString;
};

export type DailyStocksRecord = {
  closing_bal?: number;
  company: RecordIdString;
  date: IsoDateString;
  opening_bal?: number;
  product: RecordIdString;
  sku: RecordIdString;
  user: RecordIdString;
};

export type ExpensesRecord = {
  amount?: number;
  purpose?: string;
};

export enum InvoicesStatusOptions {
  "paid" = "paid",
  "partial" = "partial",
  "pending" = "pending",
}

export enum InvoicesTypeOptions {
  "sales" = "sales",
  "purchase" = "purchase",
}
export type InvoicesRecord = {
  amount?: number;
  bal?: number;
  company: RecordIdString;
  date: IsoDateString;
  partner: RecordIdString;
  status?: InvoicesStatusOptions;
  transactions?: RecordIdString[];
  type?: InvoicesTypeOptions;
  user: RecordIdString;
};

export type PartnersRecord = {
  balance?: number;
  company: RecordIdString;
  name: string;
  phone: string;
};

export type ProductsRecord<Tbalances = unknown, Tprices = unknown> = {
  balances: null | Tbalances;
  company: RecordIdString;
  image: string;
  name: string;
  prices?: null | Tprices;
  skus: RecordIdString[];
};

export type PurchasesRecord = {
  company: RecordIdString;
  date: IsoDateString;
  invoice?: RecordIdString;
  product?: RecordIdString;
  quantity: number;
  sku?: RecordIdString;
  transaction?: RecordIdString;
  user: RecordIdString;
};

export type SalesRecord = {
  Product: RecordIdString;
  amount?: number;
  company: RecordIdString;
  date: IsoDateString;
  invoice?: RecordIdString;
  sku: RecordIdString;
  transaction?: RecordIdString[];
};

export type SkusRecord = {
  initials: string;
  name: string;
};

export enum TransactionsTypeOptions {
  "debit" = "debit",
  "credit" = "credit",
}
export type TransactionsRecord = {
  account?: RecordIdString;
  amount?: number;
  company: RecordIdString;
  date: IsoDateString;
  transaction_id?: string;
  type?: TransactionsTypeOptions;
};

export enum UsersLevelOptions {
  "admin" = "admin",
  "sales" = "sales",
  "accounts" = "accounts",
}
export type UsersRecord = {
  avatar?: string;
  company: RecordIdString[];
  defaultCompany: RecordIdString;
  level: UsersLevelOptions;
  name?: string;
};

// Response types include system fields and match responses from the PocketBase API
export type AccountTypesResponse<Texpand = unknown> =
  Required<AccountTypesRecord> & BaseSystemFields<Texpand>;
export type AccountsResponse<Texpand = unknown> = Required<AccountsRecord> &
  BaseSystemFields<Texpand>;
export type CompaniesResponse<Texpand = unknown> = Required<CompaniesRecord> &
  BaseSystemFields<Texpand>;
export type DailyFinancialsResponse<Texpand = unknown> =
  Required<DailyFinancialsRecord> & BaseSystemFields<Texpand>;
export type DailyOpenCloseResponse<Texpand = unknown> =
  Required<DailyOpenCloseRecord> & BaseSystemFields<Texpand>;
export type DailyStocksResponse<Texpand = unknown> =
  Required<DailyStocksRecord> & BaseSystemFields<Texpand>;
export type ExpensesResponse<Texpand = unknown> = Required<ExpensesRecord> &
  BaseSystemFields<Texpand>;
export type InvoicesResponse<Texpand = unknown> = Required<InvoicesRecord> &
  BaseSystemFields<Texpand>;
export type PartnersResponse<Texpand = unknown> = Required<PartnersRecord> &
  BaseSystemFields<Texpand>;
export type ProductsResponse<
  Tbalances = unknown,
  Tprices = unknown,
  Texpand = unknown,
> = Required<ProductsRecord<Tbalances, Tprices>> & BaseSystemFields<Texpand>;
export type PurchasesResponse<Texpand = unknown> = Required<PurchasesRecord> &
  BaseSystemFields<Texpand>;
export type SalesResponse<Texpand = unknown> = Required<SalesRecord> &
  BaseSystemFields<Texpand>;
export type SkusResponse<Texpand = unknown> = Required<SkusRecord> &
  BaseSystemFields<Texpand>;
export type TransactionsResponse<Texpand = unknown> =
  Required<TransactionsRecord> & BaseSystemFields<Texpand>;
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> &
  AuthSystemFields<Texpand>;

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
  account_types: AccountTypesRecord;
  accounts: AccountsRecord;
  companies: CompaniesRecord;
  daily_financials: DailyFinancialsRecord;
  daily_open_close: DailyOpenCloseRecord;
  daily_stocks: DailyStocksRecord;
  expenses: ExpensesRecord;
  invoices: InvoicesRecord;
  partners: PartnersRecord;
  products: ProductsRecord;
  purchases: PurchasesRecord;
  sales: SalesRecord;
  skus: SkusRecord;
  transactions: TransactionsRecord;
  users: UsersRecord;
};

export type CollectionResponses = {
  account_types: AccountTypesResponse;
  accounts: AccountsResponse;
  companies: CompaniesResponse;
  daily_financials: DailyFinancialsResponse;
  daily_open_close: DailyOpenCloseResponse;
  daily_stocks: DailyStocksResponse;
  expenses: ExpensesResponse;
  invoices: InvoicesResponse;
  partners: PartnersResponse;
  products: ProductsResponse;
  purchases: PurchasesResponse;
  sales: SalesResponse;
  skus: SkusResponse;
  transactions: TransactionsResponse;
  users: UsersResponse;
};

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = PocketBase & {
  collection(idOrName: "account_types"): RecordService<AccountTypesResponse>;
  collection(idOrName: "accounts"): RecordService<AccountsResponse>;
  collection(idOrName: "companies"): RecordService<CompaniesResponse>;
  collection(
    idOrName: "daily_financials",
  ): RecordService<DailyFinancialsResponse>;
  collection(
    idOrName: "daily_open_close",
  ): RecordService<DailyOpenCloseResponse>;
  collection(idOrName: "daily_stocks"): RecordService<DailyStocksResponse>;
  collection(idOrName: "expenses"): RecordService<ExpensesResponse>;
  collection(idOrName: "invoices"): RecordService<InvoicesResponse>;
  collection(idOrName: "partners"): RecordService<PartnersResponse>;
  collection(idOrName: "products"): RecordService<ProductsResponse>;
  collection(idOrName: "purchases"): RecordService<PurchasesResponse>;
  collection(idOrName: "sales"): RecordService<SalesResponse>;
  collection(idOrName: "skus"): RecordService<SkusResponse>;
  collection(idOrName: "transactions"): RecordService<TransactionsResponse>;
  collection(idOrName: "users"): RecordService<UsersResponse>;
};
