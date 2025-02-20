package lib

import (
	"fmt"

	"github.com/kisinga/dukahub/models"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

type DbHelper struct {
	Pb *pocketbase.PocketBase
}

const baseURL = "http://127.0.0.1:8090"

// replace the existing logos with valid urls
// use this format http://127.0.0.1:8090/api/files/COLLECTION_ID_OR_NAME/RECORD_ID/FILENAME?thumb=100x300
func generateFileUrl(collection, recordId, fileName string) string {
	return fmt.Sprintf("/api/files/%s/%s/%s?thumb=100x300", collection, recordId, fileName)
}

func (helper *DbHelper) FetchAdminsById(id string) (*models.Admins, error) {
	record, error := helper.Pb.FindRecordById(models.CName[models.Admins](), id)
	if error != nil {
		return nil, error
	}
	expanded := helper.Pb.ExpandRecords([]*core.Record{record}, []string{"company"}, nil)
	if len(expanded) > 0 {
		return nil, fmt.Errorf("Error expanding company data")
	}

	admin, error := models.WrapRecord[models.Admins](record)

	admin.SetAvatar(generateFileUrl(models.CName[models.Admins](), admin.Id, admin.Avatar()))

	for _, company := range admin.Company() {
		company.SetLogo(generateFileUrl(models.CName[models.Companies](), company.Id, company.Logo()))
	}

	return admin, nil

}

func (helper *DbHelper) FetchCompaniesById(id string) (*models.Companies, error) {
	record, error := helper.Pb.FindRecordById("companies", id)
	if error != nil {
		return nil, error
	}
	return &models.Companies{BaseRecordProxy: core.BaseRecordProxy{
		Record: record,
	}}, nil

}

func (helper *DbHelper) FetchDashboardData(userID string) (*models.DashboardData, error) {
	admin, error := helper.FetchAdminsById(userID)
	if error != nil {
		return nil, error
	}
	// Fetch user companies

	// Fetch company stats
	return &models.DashboardData{
		Admin:         *admin,
		CompanyStats:  []models.CompanyStats{},
		Activecompany: *admin.Company()[0],
	}, nil
}
