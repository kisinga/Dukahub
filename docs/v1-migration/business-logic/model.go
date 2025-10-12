package lib

import "github.com/kisinga/dukahub/models"

func (helper *DbHelper) FetchModel(companyID string) (*models.Models, error) {
	record, error := helper.pb.FindFirstRecordByData(models.CName[models.Models](), "company", companyID)
	if error != nil {
		return nil, error
	}
	model, err := models.WrapRecord[models.Models](record)
	if err != nil {
		return nil, err
	}

	model.SetModel(generateFileUrl(models.CName[models.Models](), model.Id, model.Model()))
	model.SetMetadata(generateFileUrl(models.CName[models.Models](), model.Id, model.Metadata()))
	model.SetWeights(generateFileUrl(models.CName[models.Models](), model.Id, model.Weights()))

	return model, nil
}
