package models

import (
	"github.com/pocketbase/pocketbase/core"
)

// var _ models.Model = (*UsersRecord)(nil)

func (UsersRecord) TableName() string {
	return string(Users)
}

type Collections string

const (
	AccountTypes    Collections = "account_types"
	Accounts        Collections = "accounts"
	Companies       Collections = "companies"
	DailyFinancials Collections = "daily_financials"
	DailyOpenClose  Collections = "daily_open_close"
	DailyStocks     Collections = "daily_stocks"
	Expenses        Collections = "expenses"
	Invoices        Collections = "invoices"
	Partners        Collections = "partners"
	Products        Collections = "products"
	Purchases       Collections = "purchases"
	Sales           Collections = "sales"
	Skus            Collections = "skus"
	Transactions    Collections = "transactions"
	Users           Collections = "users"
)

type IsoDateString string
type RecordIdString string
type HTMLString string

type BaseSystemFields[T any] struct {
	ID             RecordIdString `json:"id"`
	Created        IsoDateString  `json:"created"`
	Updated        IsoDateString  `json:"updated"`
	CollectionId   string         `json:"collectionId"`
	CollectionName Collections    `json:"collectionName"`
	Expand         *T             `json:"expand,omitempty"`
}

type AuthSystemFields[T any] struct {
	Email            string              `json:"email"`
	EmailVisibility  bool                `json:"emailVisibility"`
	Username         string              `json:"username"`
	Verified         bool                `json:"verified"`
	BaseSystemFields BaseSystemFields[T] `json:"baseSystemFields"`
}

type AccountTypesRecord struct {
	Icons []string `json:"icons"`
	Name  string   `json:"name"`
}

type AccountsRecord struct {
	AccountNumber RecordIdString `json:"account_number,omitempty"`
	Bal           *float64       `json:"bal,omitempty"`
	Company       RecordIdString `json:"company"`
	IconID        *int           `json:"icon_id,omitempty"`
	Name          *string        `json:"name,omitempty"`
	Type          RecordIdString `json:"type"`
}

type CompaniesRecord struct {
	Location *string `json:"location,omitempty"`
	Logo     *string `json:"logo,omitempty"`
	Name     *string `json:"name,omitempty"`
	Phone    *string `json:"phone,omitempty"`
}

type DailyFinancialsRecord struct {
	Account    RecordIdString `json:"account"`
	ClosingBal *float64       `json:"closing_bal,omitempty"`
	Company    RecordIdString `json:"company"`
	Date       IsoDateString  `json:"date"`
	Notes      *HTMLString    `json:"notes,omitempty"`
	OpeningBal *float64       `json:"opening_bal,omitempty"`
	User       RecordIdString `json:"user"`
}

type DailyOpenCloseStatusOptions string

const (
	Open   DailyOpenCloseStatusOptions = "open"
	Closed DailyOpenCloseStatusOptions = "closed"
)

type DailyOpenCloseRecord struct {
	CloseTime IsoDateString               `json:"close_time"`
	Date      *IsoDateString              `json:"date,omitempty"`
	OpenTime  IsoDateString               `json:"open_time"`
	Status    DailyOpenCloseStatusOptions `json:"status"`
	User      *RecordIdString             `json:"user,omitempty"`
}

type DailyStocksRecord struct {
	ClosingBal *float64       `json:"closing_bal,omitempty"`
	Company    RecordIdString `json:"company"`
	Date       IsoDateString  `json:"date"`
	OpeningBal *float64       `json:"opening_bal,omitempty"`
	Product    RecordIdString `json:"product"`
	Sku        RecordIdString `json:"sku"`
	User       RecordIdString `json:"user"`
}

type ExpensesRecord struct {
	Amount  *float64 `json:"amount,omitempty"`
	Purpose *string  `json:"purpose,omitempty"`
}

type InvoicesStatusOptions string

const (
	Paid    InvoicesStatusOptions = "paid"
	Partial InvoicesStatusOptions = "partial"
	Pending InvoicesStatusOptions = "pending"
)

type InvoicesTypeOptions string

const (
	SalesInvoicesType    InvoicesTypeOptions = "sales"
	PurchaseInvoicesType InvoicesTypeOptions = "purchase"
)

type InvoicesRecord struct {
	Amount       *float64               `json:"amount,omitempty"`
	Bal          *float64               `json:"bal,omitempty"`
	Company      RecordIdString         `json:"company"`
	Date         IsoDateString          `json:"date"`
	Partner      RecordIdString         `json:"partner"`
	Status       *InvoicesStatusOptions `json:"status,omitempty"`
	Transactions *[]RecordIdString      `json:"transactions,omitempty"`
	Type         *InvoicesTypeOptions   `json:"type,omitempty"`
	User         RecordIdString         `json:"user"`
}

type PartnersRecord struct {
	Balance RecordIdString `json:"balance,omitempty"`
	Company RecordIdString `json:"company"`
	Name    string         `json:"name"`
	Phone   string         `json:"phone"`
}

type ProductsRecord[Tbalances any, Tprices any] struct {
	Balances *Tbalances       `json:"balances,omitempty"`
	Company  RecordIdString   `json:"company"`
	Image    string           `json:"image"`
	Name     string           `json:"name"`
	Prices   *Tprices         `json:"prices,omitempty"`
	Skus     []RecordIdString `json:"skus"`
}

type PurchasesRecord struct {
	Company     RecordIdString  `json:"company"`
	Date        IsoDateString   `json:"date"`
	Invoice     *RecordIdString `json:"invoice,omitempty"`
	Product     *RecordIdString `json:"product,omitempty"`
	Quantity    int             `json:"quantity"`
	Sku         *RecordIdString `json:"sku,omitempty"`
	Transaction *RecordIdString `json:"transaction,omitempty"`
	User        RecordIdString  `json:"user"`
}

type SalesRecord struct {
	Product     RecordIdString    `json:"Product"`
	Amount      *float64          `json:"amount,omitempty"`
	Company     RecordIdString    `json:"company"`
	Date        IsoDateString     `json:"date"`
	Invoice     *RecordIdString   `json:"invoice,omitempty"`
	Sku         RecordIdString    `json:"sku"`
	Transaction *[]RecordIdString `json:"transaction,omitempty"`
}

type SkusRecord struct {
	Initials string `json:"initials"`
	Name     string `json:"name"`
}

type TransactionsTypeOptions string

const (
	Debit  TransactionsTypeOptions = "debit"
	Credit TransactionsTypeOptions = "credit"
)

type TransactionsRecord struct {
	Account       *RecordIdString          `json:"account,omitempty"`
	Amount        *float64                 `json:"amount,omitempty"`
	Company       RecordIdString           `json:"company"`
	Date          IsoDateString            `json:"date"`
	TransactionID *string                  `json:"transaction_id,omitempty"`
	Type          *TransactionsTypeOptions `json:"type,omitempty"`
}

type UsersLevelOptions string

const (
	UsersLevel         UsersLevelOptions = "admin"
	SalesUsersLevel    UsersLevelOptions = "sales"
	AccountsUsersLevel UsersLevelOptions = "accounts"
)

type UsersRecord struct {
	core.BaseModel

	Avatar         *string           `json:"avatar,omitempty"`
	Company        []RecordIdString  `json:"company"`
	DefaultCompany RecordIdString    `json:"defaultCompany"`
	Level          UsersLevelOptions `json:"level"`
	Name           *string           `json:"name,omitempty"`
}
