/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export enum Collections {
	AccountNames = "account_names",
	Accounts = "accounts",
	Companies = "companies",
	Customers = "customers",
	DailyFinancials = "daily_financials",
	DailyStocks = "daily_stocks",
	FinancialTransactions = "financial_transactions",
	Invoices = "invoices",
	Payments = "payments",
	Products = "products",
	Purchases = "purchases",
	Sales = "sales",
	Skus = "skus",
	StockBalances = "stock_balances",
	StockTransactions = "stock_transactions",
	Users = "users",
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string
export type HTMLString = string

// System fields
export type BaseSystemFields<T = never> = {
	id: RecordIdString
	created: IsoDateString
	updated: IsoDateString
	collectionId: string
	collectionName: Collections
	expand?: T
}

export type AuthSystemFields<T = never> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type AccountNamesRecord = {
	name: string
}

export type AccountsRecord = {
	account_number?: string
	bal?: number
	company: RecordIdString
	type: RecordIdString
}

export type CompaniesRecord = {
	location?: string
	logo?: string
	name?: string
}

export type CustomersRecord = {
	company: RecordIdString
	name: string
	phone: string
}

export type DailyFinancialsRecord = {
	account: RecordIdString
	closing_bal?: number
	company: RecordIdString
	notes?: HTMLString
	opening_bal?: number
	user?: RecordIdString
}

export type DailyStocksRecord = {
	closing_bal?: number
	company: RecordIdString
	opening_bal?: number
	product: RecordIdString
	purchases?: RecordIdString[]
	sku: RecordIdString
	user?: RecordIdString
}

export enum FinancialTransactionsTypeOptions {
	"debit" = "debit",
	"credit" = "credit",
}
export type FinancialTransactionsRecord = {
	account?: RecordIdString
	amount?: number
	company?: RecordIdString
	type?: FinancialTransactionsTypeOptions
}

export enum InvoicesStatusOptions {
	"paid" = "paid",
	"partial" = "partial",
	"pending" = "pending",
}
export type InvoicesRecord = {
	amount?: number
	bal?: number
	company: RecordIdString
	customer: RecordIdString
	payments?: HTMLString
	status?: InvoicesStatusOptions
	user: RecordIdString
}

export type PaymentsRecord = {
	account: RecordIdString
	amount: number
	company: RecordIdString
}

export type ProductsRecord = {
	company: RecordIdString
	name: string
	skus: RecordIdString[]
}

export type PurchasesRecord = {
	Product?: RecordIdString
	Quantity: number
	company: RecordIdString
	sku?: RecordIdString
	user: RecordIdString
}

export enum SalesTypeOptions {
	"cash" = "cash",
	"credit" = "credit",
}
export type SalesRecord = {
	Product: RecordIdString
	amount?: number
	company: RecordIdString
	invoice?: RecordIdString
	sku: RecordIdString
	transaction?: RecordIdString
	type?: SalesTypeOptions
}

export type SkusRecord = {
	initials: string
	name: string
}

export type StockBalancesRecord = {
	bal?: number
	company?: RecordIdString
	product?: RecordIdString
}

export enum StockTransactionsTypeOptions {
	"debit" = "debit",
	"credit" = "credit",
}
export type StockTransactionsRecord = {
	invoice?: RecordIdString
	type?: StockTransactionsTypeOptions
}

export enum UsersLevelOptions {
	"admin" = "admin",
	"sales" = "sales",
	"accounts" = "accounts",
}
export type UsersRecord = {
	avatar?: string
	company: RecordIdString
	level: UsersLevelOptions
	name?: string
}

// Response types include system fields and match responses from the PocketBase API
export type AccountNamesResponse<Texpand = unknown> = Required<AccountNamesRecord> & BaseSystemFields<Texpand>
export type AccountsResponse<Texpand = unknown> = Required<AccountsRecord> & BaseSystemFields<Texpand>
export type CompaniesResponse<Texpand = unknown> = Required<CompaniesRecord> & BaseSystemFields<Texpand>
export type CustomersResponse<Texpand = unknown> = Required<CustomersRecord> & BaseSystemFields<Texpand>
export type DailyFinancialsResponse<Texpand = unknown> = Required<DailyFinancialsRecord> & BaseSystemFields<Texpand>
export type DailyStocksResponse<Texpand = unknown> = Required<DailyStocksRecord> & BaseSystemFields<Texpand>
export type FinancialTransactionsResponse<Texpand = unknown> = Required<FinancialTransactionsRecord> & BaseSystemFields<Texpand>
export type InvoicesResponse<Texpand = unknown> = Required<InvoicesRecord> & BaseSystemFields<Texpand>
export type PaymentsResponse<Texpand = unknown> = Required<PaymentsRecord> & BaseSystemFields<Texpand>
export type ProductsResponse<Texpand = unknown> = Required<ProductsRecord> & BaseSystemFields<Texpand>
export type PurchasesResponse<Texpand = unknown> = Required<PurchasesRecord> & BaseSystemFields<Texpand>
export type SalesResponse<Texpand = unknown> = Required<SalesRecord> & BaseSystemFields<Texpand>
export type SkusResponse<Texpand = unknown> = Required<SkusRecord> & BaseSystemFields<Texpand>
export type StockBalancesResponse<Texpand = unknown> = Required<StockBalancesRecord> & BaseSystemFields<Texpand>
export type StockTransactionsResponse<Texpand = unknown> = Required<StockTransactionsRecord> & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	account_names: AccountNamesRecord
	accounts: AccountsRecord
	companies: CompaniesRecord
	customers: CustomersRecord
	daily_financials: DailyFinancialsRecord
	daily_stocks: DailyStocksRecord
	financial_transactions: FinancialTransactionsRecord
	invoices: InvoicesRecord
	payments: PaymentsRecord
	products: ProductsRecord
	purchases: PurchasesRecord
	sales: SalesRecord
	skus: SkusRecord
	stock_balances: StockBalancesRecord
	stock_transactions: StockTransactionsRecord
	users: UsersRecord
}

export type CollectionResponses = {
	account_names: AccountNamesResponse
	accounts: AccountsResponse
	companies: CompaniesResponse
	customers: CustomersResponse
	daily_financials: DailyFinancialsResponse
	daily_stocks: DailyStocksResponse
	financial_transactions: FinancialTransactionsResponse
	invoices: InvoicesResponse
	payments: PaymentsResponse
	products: ProductsResponse
	purchases: PurchasesResponse
	sales: SalesResponse
	skus: SkusResponse
	stock_balances: StockBalancesResponse
	stock_transactions: StockTransactionsResponse
	users: UsersResponse
}

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = PocketBase & {
	collection(idOrName: 'account_names'): RecordService<AccountNamesResponse>
	collection(idOrName: 'accounts'): RecordService<AccountsResponse>
	collection(idOrName: 'companies'): RecordService<CompaniesResponse>
	collection(idOrName: 'customers'): RecordService<CustomersResponse>
	collection(idOrName: 'daily_financials'): RecordService<DailyFinancialsResponse>
	collection(idOrName: 'daily_stocks'): RecordService<DailyStocksResponse>
	collection(idOrName: 'financial_transactions'): RecordService<FinancialTransactionsResponse>
	collection(idOrName: 'invoices'): RecordService<InvoicesResponse>
	collection(idOrName: 'payments'): RecordService<PaymentsResponse>
	collection(idOrName: 'products'): RecordService<ProductsResponse>
	collection(idOrName: 'purchases'): RecordService<PurchasesResponse>
	collection(idOrName: 'sales'): RecordService<SalesResponse>
	collection(idOrName: 'skus'): RecordService<SkusResponse>
	collection(idOrName: 'stock_balances'): RecordService<StockBalancesResponse>
	collection(idOrName: 'stock_transactions'): RecordService<StockTransactionsResponse>
	collection(idOrName: 'users'): RecordService<UsersResponse>
}
