package lib

import "github.com/kisinga/dukahub/models"

func (helper *DbHelper) FetchAdminById(id string) (*models.Admins, error) {
	record, error := helper.Pb.FindRecordById(models.CName[models.Admins](), id)
	if error != nil {
		return nil, error
	}

	admin, error := models.WrapRecord[models.Admins](record)

	admin.SetAvatar(generateImageUrl(models.CName[models.Admins](), admin.Id, admin.Avatar(), ThumnailSize{Width: 100, Height: 100}))

	return admin, nil

}
