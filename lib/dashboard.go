package lib

import (
	"fmt"

	"github.com/kisinga/dukahub/models"
)

func (helper *DbHelper) FetchDashboardData(userID string, companyID string) (*models.DashboardData, error) {
	user, error := helper.FetchUserById(userID)
	if error != nil {
		return nil, error
	}
	if companyID == "" {
		// Fetch company stats
		return &models.DashboardData{
			User:          *user,
			CompanyStats:  []models.CompanyStats{},
			Activecompany: *user.Company()[0],
		}, nil
	}

	if len(user.Company()) == 0 {
		return nil, fmt.Errorf("Admin has no company")
	}

	// fetch the model
	model, error := helper.FetchModel(companyID)
	if error != nil {
		helper.Logger.Println("Error fetching model: ", error)
		model = &models.Models{}
	}
	for _, company := range user.Company() {
		if company.Id == companyID {
			return &models.DashboardData{
				User:          *user,
				CompanyStats:  []models.CompanyStats{},
				Activecompany: *company,
				Model:         *model,
			}, nil
		}
	}
	return nil, fmt.Errorf("Company not found")
}
