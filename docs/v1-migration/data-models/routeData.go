package models

type DashboardData struct {
	User          *Users
	CompanyStats  []CompanyStats
	Activecompany *Companies
	Model         *Models
}

type CompanySettings struct {
	User          *Users
	Activecompany *Companies
	Companies     []Companies
}
