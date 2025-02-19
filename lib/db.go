package lib

import (
	"github.com/kisinga/dukahub/models"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

type DbHelper struct {
	Pb *pocketbase.PocketBase
}

func (helper *DbHelper) FetchAdminsById(id string) (*models.Admins, error) {
	record, error := helper.Pb.FindRecordById("admins", id)
	if error != nil {
		return nil, error
	}
	return &models.Admins{BaseRecordProxy: core.BaseRecordProxy{
		Record: record,
	}}, nil

}
