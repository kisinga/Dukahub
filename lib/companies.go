package lib

import (
	"fmt"
	"time"

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

func (helper *DbHelper) FetchAllCompanies() ([]*models.Companies, error) {
	records := []*core.Record{}
	records, err := helper.pb.FindRecordsByFilter("companies", "", "-created", 0, 0)
	if err != nil {
		return nil, err
	}
	companies := make([]*models.Companies, len(records))
	for i, record := range records {
		company, err := models.WrapRecord[models.Companies](record)
		if err != nil {
			return nil, err
		}
		companies[i] = company
	}
	return companies, nil
}

func (helper *DbHelper) CountProductsByCompanyID(companyID string) (int, error) {
	return helper.CountRecordsByFilter("products", fmt.Sprintf("company = '%s'", companyID))
}

func (helper *DbHelper) CountUsersByCompanyID(companyID string) (int, error) {
	return helper.CountRecordsByFilter("users", fmt.Sprintf("company = '%s'", companyID))
}

func (helper *DbHelper) CountCompanyAccountsByCompanyID(companyID string) (int, error) {
	return helper.CountRecordsByFilter("company_accounts", fmt.Sprintf("company = '%s'", companyID))
}

func (helper *DbHelper) CountPartnersByCompanyID(companyID string) (int, error) {
	return helper.CountRecordsByFilter("partners", fmt.Sprintf("company = '%s'", companyID))
}

func (helper *DbHelper) CreateCompany(company *models.Companies) (*models.Companies, error) {

	collection, err := helper.pb.App.FindCollectionByNameOrId(company.CollectionName())
	if err != nil {
		return nil, err
	}

	record := core.NewRecord(collection)
	record.Load(company.FieldsData())

	err = helper.pb.App.Save(record)
	if err != nil {
		return nil, err
	}

	return models.WrapRecord[models.Companies](record)
}
func (helper *DbHelper) UpdateCompany(companyID string, company *models.Companies) (*models.Companies, error) {
	record, err := helper.pb.FindRecordById("companies", companyID)
	if err != nil {
		return nil, err
	}
	record.Load(company.FieldsData())
	err = helper.pb.App.Save(record)
	if err != nil {
		return nil, err
	}
	return models.WrapRecord[models.Companies](record)
}

// we should only soft-delete
func (helper *DbHelper) DeleteCompany(companyID string) error {
	record, err := helper.pb.FindRecordById("companies", companyID)
	if err != nil {
		return err
	}
	// set the deleted_at field to the current time
	record.Set("deleted_at", time.Now())
	err = helper.pb.App.Save(record)
	if err != nil {
		return err
	}
	return nil
}
