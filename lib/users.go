package lib

import (
	"fmt"

	"github.com/kisinga/dukahub/models"
	"github.com/pocketbase/pocketbase/core"
)

func (helper *DbHelper) FetchUserById(id string) (*models.Users, error) {
	record, error := helper.pb.FindRecordById(models.CName[models.Users](), id)
	if error != nil {
		return nil, error
	}
	expanded := helper.pb.ExpandRecords([]*core.Record{record}, []string{"company"}, nil)
	if len(expanded) > 0 {
		return nil, fmt.Errorf("Error expanding company data")
	}

	user, error := models.WrapRecord[models.Users](record)

	user.SetAvatar(generateImageUrl(models.CName[models.Users](), user.Id, user.Avatar(), ThumnailSize{Width: 100, Height: 100}))

	for _, company := range user.Company() {
		company.SetLogo(generateImageUrl(models.CName[models.Companies](), company.Id, company.Logo(), ThumnailSize{Width: 100, Height: 100}))
	}

	return user, nil

}
