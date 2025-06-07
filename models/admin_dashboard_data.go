package models

type CompanyDashboardData struct {
	Company          *Companies
	ProductsCount    int
	UsersCount       int
	AccountsCount    int
	PartnersCount    int
	ModelStatus      string
	TrainDate        string
	NewItemsCount    int
	NewImagesCount   int
	TotalImagesCount int
}
