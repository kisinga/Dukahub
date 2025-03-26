package lib

import (
	"fmt"

	"github.com/kisinga/dukahub/models"
	"github.com/pocketbase/pocketbase/core"
)

func (helper *DbHelper) FetchCompanyById(id string) (*models.Companies, error) {
	record, error := helper.pb.FindRecordById("companies", id)
	if error != nil {
		return nil, error
	}
	return models.WrapRecord[models.Companies](record)
}

func (helper *DbHelper) FetchCompaniesUnderUser(userID string) ([]*models.Companies, error) {
	records := []*core.Record{}
	records, err := helper.pb.FindRecordsByFilter("companies",
		fmt.Sprintf("users_via_company.id ?= '%s'", userID),
		"-created",
		0,
		0)

	if err != nil {
		return nil, err
	}
	companies := make([]*models.Companies, len(records))
	for _, record := range records {
		company, err := models.WrapRecord[models.Companies](record)
		if err != nil {
			return nil, err
		}
		companies = append(companies, company)
	}
	return companies, nil
}
