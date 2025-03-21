package lib

import (
	"fmt"

	"github.com/kisinga/dukahub/models"
)

func (helper *DbHelper) FetchDashboardData(userID string, companyID string) (*models.DashboardData, error) {
	admin, error := helper.FetchAdminsById(userID)
	if error != nil {
		return nil, error
	}
	if companyID == "" {
		// Fetch company stats
		return &models.DashboardData{
			Admin:         *admin,
			CompanyStats:  []models.CompanyStats{},
			Activecompany: *admin.Company()[0],
		}, nil
	}

	if len(admin.Company()) == 0 {
		return nil, fmt.Errorf("Admin has no company")
	}

	// fetch the model
	model, error := helper.FetchModel(companyID)
	if error != nil {
		helper.Logger.Println("Error fetching model: ", error)
		model = &models.Models{}
	}
	for _, company := range admin.Company() {
		if company.Id == companyID {
			return &models.DashboardData{
				Admin:         *admin,
				CompanyStats:  []models.CompanyStats{},
				Activecompany: *company,
				Model:         *model,
			}, nil
		}
	}
	return nil, fmt.Errorf("Company not found")
}
