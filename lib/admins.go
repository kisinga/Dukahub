package lib

import (
	"fmt"

	"github.com/kisinga/dukahub/models"
	"github.com/pocketbase/pocketbase/core"
)

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

	admin.SetAvatar(generateImageUrl(models.CName[models.Admins](), admin.Id, admin.Avatar(), ThumnailSize{Width: 100, Height: 100}))

	for _, company := range admin.Company() {
		company.SetLogo(generateImageUrl(models.CName[models.Companies](), company.Id, company.Logo(), ThumnailSize{Width: 100, Height: 100}))
	}

	return admin, nil

}
