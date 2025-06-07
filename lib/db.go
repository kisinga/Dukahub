package lib

import (
	"log"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

type DbHelper struct {
	pb     *pocketbase.PocketBase
	Logger *log.Logger
}

func NewDbHelper(pb *pocketbase.PocketBase, logger *log.Logger) *DbHelper {
	return &DbHelper{
		pb:     pb,
		Logger: logger,
	}
}

func (helper *DbHelper) FindAuthRecordByToken(token string) (*core.Record, error) {
	return helper.pb.FindAuthRecordByToken(token)
}

func (helper *DbHelper) CountRecordsByFilter(collectionName, filter string) (int, error) {
	records, err := helper.pb.FindRecordsByFilter(collectionName, filter, "", 0, 0)
	if err != nil {
		return 0, err
	}
	return len(records), nil
}
