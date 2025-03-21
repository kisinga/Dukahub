package lib

import "github.com/kisinga/dukahub/models"

func (helper *DbHelper) FetchCompaniesById(id string) (*models.Companies, error) {
	record, error := helper.Pb.FindRecordById("companies", id)
	if error != nil {
		return nil, error
	}
	return models.WrapRecord[models.Companies](record)
}
