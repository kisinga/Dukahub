/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export enum Collections {
	Authorigins = "_authOrigins",
	Externalauths = "_externalAuths",
	Mfas = "_mfas",
	Otps = "_otps",
	Superusers = "_superusers",
	AccountTypes = "account_types",
	Admins = "admins",
	Companies = "companies",
	CompanyAccounts = "company_accounts",
	DailyAccounts = "daily_accounts",
	DailyStockTakes = "daily_stock_takes",
	Expenses = "expenses",
	Invoices = "invoices",
	OpenCloseDetails = "open_close_details",
	Partners = "partners",
	ProductSkuFigures = "product_sku_figures",
	Products = "products",
	Purchases = "purchases",
	Sales = "sales",
	Skus = "skus",
	Transactions = "transactions",
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string
export type HTMLString = string

// System fields
export type BaseSystemFields<T = never> = {
	id: RecordIdString
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

export type AuthoriginsRecord = {
	collectionRef: string
	created?: IsoDateString
	fingerprint: string
	id: string
	recordRef: string
	updated?: IsoDateString
}

export type ExternalauthsRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	provider: string
	providerId: string
	recordRef: string
	updated?: IsoDateString
}

export type MfasRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	method: string
	recordRef: string
	updated?: IsoDateString
}

export type OtpsRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	password: string
	recordRef: string
	sentTo?: string
	updated?: IsoDateString
}

export type SuperusersRecord = {
	created?: IsoDateString
	email: string
	emailVisibility?: boolean
	id: string
	password: string
	tokenKey: string
	updated?: IsoDateString
	verified?: boolean
}

export type AccountTypesRecord = {
	created?: IsoDateString
	icons: string[]
	id: string
	name: string
	updated?: IsoDateString
}

export enum AdminsLevelOptions {
	"admin" = "admin",
	"sales" = "sales",
	"accounts" = "accounts",
}
export type AdminsRecord = {
	avatar?: string
	company: RecordIdString[]
	created?: IsoDateString
	defaultCompany: RecordIdString
	email?: string
	emailVisibility?: boolean
	id: string
	level: AdminsLevelOptions
	name?: string
	password: string
	tokenKey: string
	updated?: IsoDateString
	username: string
	verified?: boolean
}

export type CompaniesRecord = {
	created?: IsoDateString
	id: string
	location?: string
	logo?: string
	name?: string
	phone?: string
	updated?: IsoDateString
}

export type CompanyAccountsRecord = {
	account_number?: string
	bal?: number
	company: RecordIdString
	created?: IsoDateString
	icon_id?: number
	id: string
	name?: string
	type: RecordIdString
	updated?: IsoDateString
}

export type DailyAccountsRecord = {
	account: RecordIdString
	closing_bal?: number
	company: RecordIdString
	created?: IsoDateString
	date: IsoDateString
	id: string
	notes?: HTMLString
	opening_bal?: number
	updated?: IsoDateString
	user: RecordIdString
}

export type DailyStockTakesRecord = {
	closing_bal?: number
	company: RecordIdString
	created?: IsoDateString
	date: IsoDateString
	id: string
	opening_bal?: number
	product: RecordIdString
	sku: RecordIdString
	updated?: IsoDateString
	user: RecordIdString
}

export type ExpensesRecord = {
	amount?: number
	created?: IsoDateString
	id: string
	purpose?: string
	transaction?: RecordIdString
	updated?: IsoDateString
}

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
	amount?: number
	bal?: number
	company: RecordIdString
	created?: IsoDateString
	date: IsoDateString
	id: string
	partner: RecordIdString
	status?: InvoicesStatusOptions
	transactions?: RecordIdString[]
	type?: InvoicesTypeOptions
	updated?: IsoDateString
	user: RecordIdString
}

export enum OpenCloseDetailsStatusOptions {
	"open" = "open",
	"closed" = "closed",
}
export type OpenCloseDetailsRecord = {
	close_time: IsoDateString
	created?: IsoDateString
	date: IsoDateString
	id: string
	open_time: IsoDateString
	status: OpenCloseDetailsStatusOptions
	updated?: IsoDateString
	user?: RecordIdString
}

export type PartnersRecord = {
	balance?: number
	company: RecordIdString
	created?: IsoDateString
	id: string
	name: string
	phone: string
	updated?: IsoDateString
}

export type ProductSkuFiguresRecord = {
	bal?: number
	created?: IsoDateString
	id: string
	price?: number
	product: RecordIdString
	sku: RecordIdString
	updated?: IsoDateString
}

export type ProductsRecord = {
	company: RecordIdString
	created?: IsoDateString
	id: string
	image: string
	name: string
	skus: RecordIdString[]
	updated?: IsoDateString
}

export type PurchasesRecord = {
	company: RecordIdString
	created?: IsoDateString
	date: IsoDateString
	id: string
	invoice?: RecordIdString
	product?: RecordIdString
	quantity: number
	sku?: RecordIdString
	transaction?: RecordIdString
	updated?: IsoDateString
	user: RecordIdString
}

export type SalesRecord = {
	Product: RecordIdString
	amount?: number
	company: RecordIdString
	created?: IsoDateString
	date: IsoDateString
	id: string
	invoice?: RecordIdString
	sku: RecordIdString
	transaction?: RecordIdString[]
	updated?: IsoDateString
}

export type SkusRecord = {
	created?: IsoDateString
	id: string
	initials: string
	name: string
	updated?: IsoDateString
}

export enum TransactionsTypeOptions {
	"debit" = "debit",
	"credit" = "credit",
}
export type TransactionsRecord = {
	account?: RecordIdString
	amount?: number
	company: RecordIdString
	created?: IsoDateString
	date: IsoDateString
	id: string
	transaction_id?: string
	type?: TransactionsTypeOptions
	updated?: IsoDateString
}

// Response types include system fields and match responses from the PocketBase API
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> & BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> & BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> & AuthSystemFields<Texpand>
export type AccountTypesResponse<Texpand = unknown> = Required<AccountTypesRecord> & BaseSystemFields<Texpand>
export type AdminsResponse<Texpand = unknown> = Required<AdminsRecord> & AuthSystemFields<Texpand>
export type CompaniesResponse<Texpand = unknown> = Required<CompaniesRecord> & BaseSystemFields<Texpand>
export type CompanyAccountsResponse<Texpand = unknown> = Required<CompanyAccountsRecord> & BaseSystemFields<Texpand>
export type DailyAccountsResponse<Texpand = unknown> = Required<DailyAccountsRecord> & BaseSystemFields<Texpand>
export type DailyStockTakesResponse<Texpand = unknown> = Required<DailyStockTakesRecord> & BaseSystemFields<Texpand>
export type ExpensesResponse<Texpand = unknown> = Required<ExpensesRecord> & BaseSystemFields<Texpand>
export type InvoicesResponse<Texpand = unknown> = Required<InvoicesRecord> & BaseSystemFields<Texpand>
export type OpenCloseDetailsResponse<Texpand = unknown> = Required<OpenCloseDetailsRecord> & BaseSystemFields<Texpand>
export type PartnersResponse<Texpand = unknown> = Required<PartnersRecord> & BaseSystemFields<Texpand>
export type ProductSkuFiguresResponse<Texpand = unknown> = Required<ProductSkuFiguresRecord> & BaseSystemFields<Texpand>
export type ProductsResponse<Texpand = unknown> = Required<ProductsRecord> & BaseSystemFields<Texpand>
export type PurchasesResponse<Texpand = unknown> = Required<PurchasesRecord> & BaseSystemFields<Texpand>
export type SalesResponse<Texpand = unknown> = Required<SalesRecord> & BaseSystemFields<Texpand>
export type SkusResponse<Texpand = unknown> = Required<SkusRecord> & BaseSystemFields<Texpand>
export type TransactionsResponse<Texpand = unknown> = Required<TransactionsRecord> & BaseSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	_authOrigins: AuthoriginsRecord
	_externalAuths: ExternalauthsRecord
	_mfas: MfasRecord
	_otps: OtpsRecord
	_superusers: SuperusersRecord
	account_types: AccountTypesRecord
	admins: AdminsRecord
	companies: CompaniesRecord
	company_accounts: CompanyAccountsRecord
	daily_accounts: DailyAccountsRecord
	daily_stock_takes: DailyStockTakesRecord
	expenses: ExpensesRecord
	invoices: InvoicesRecord
	open_close_details: OpenCloseDetailsRecord
	partners: PartnersRecord
	product_sku_figures: ProductSkuFiguresRecord
	products: ProductsRecord
	purchases: PurchasesRecord
	sales: SalesRecord
	skus: SkusRecord
	transactions: TransactionsRecord
}

export type CollectionResponses = {
	_authOrigins: AuthoriginsResponse
	_externalAuths: ExternalauthsResponse
	_mfas: MfasResponse
	_otps: OtpsResponse
	_superusers: SuperusersResponse
	account_types: AccountTypesResponse
	admins: AdminsResponse
	companies: CompaniesResponse
	company_accounts: CompanyAccountsResponse
	daily_accounts: DailyAccountsResponse
	daily_stock_takes: DailyStockTakesResponse
	expenses: ExpensesResponse
	invoices: InvoicesResponse
	open_close_details: OpenCloseDetailsResponse
	partners: PartnersResponse
	product_sku_figures: ProductSkuFiguresResponse
	products: ProductsResponse
	purchases: PurchasesResponse
	sales: SalesResponse
	skus: SkusResponse
	transactions: TransactionsResponse
}

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = PocketBase & {
	collection(idOrName: '_authOrigins'): RecordService<AuthoriginsResponse>
	collection(idOrName: '_externalAuths'): RecordService<ExternalauthsResponse>
	collection(idOrName: '_mfas'): RecordService<MfasResponse>
	collection(idOrName: '_otps'): RecordService<OtpsResponse>
	collection(idOrName: '_superusers'): RecordService<SuperusersResponse>
	collection(idOrName: 'account_types'): RecordService<AccountTypesResponse>
	collection(idOrName: 'admins'): RecordService<AdminsResponse>
	collection(idOrName: 'companies'): RecordService<CompaniesResponse>
	collection(idOrName: 'company_accounts'): RecordService<CompanyAccountsResponse>
	collection(idOrName: 'daily_accounts'): RecordService<DailyAccountsResponse>
	collection(idOrName: 'daily_stock_takes'): RecordService<DailyStockTakesResponse>
	collection(idOrName: 'expenses'): RecordService<ExpensesResponse>
	collection(idOrName: 'invoices'): RecordService<InvoicesResponse>
	collection(idOrName: 'open_close_details'): RecordService<OpenCloseDetailsResponse>
	collection(idOrName: 'partners'): RecordService<PartnersResponse>
	collection(idOrName: 'product_sku_figures'): RecordService<ProductSkuFiguresResponse>
	collection(idOrName: 'products'): RecordService<ProductsResponse>
	collection(idOrName: 'purchases'): RecordService<PurchasesResponse>
	collection(idOrName: 'sales'): RecordService<SalesResponse>
	collection(idOrName: 'skus'): RecordService<SkusResponse>
	collection(idOrName: 'transactions'): RecordService<TransactionsResponse>
}
