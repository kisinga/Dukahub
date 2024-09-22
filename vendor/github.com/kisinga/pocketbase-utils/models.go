package dbUtils

import (
	"context"

	"github.com/pocketbase/pocketbase"
)

type DB struct {
	PB *pocketbase.PocketBase
}
type crudMethods interface {
	Connect() error
	Close() error
	InsertOne(collection string, data interface{}) error
	FindOne(collection string, query interface{}, result interface{}) error
	FindAll(collection string, query interface{}, result interface{}) error
	UpdateOne(collection string, query interface{}, update interface{}) error
	DeleteOne(collection string, query interface{}) error
	DeleteAll(collection string, query interface{}) error
	NewTransation(ctx context.Context, validate bool) (transactionMethods, error)
}

type transactionMethods interface {
	Add(collection string, data interface{}) error
	Read(collection string, data interface{}) error
	Update(collection string, data interface{}) error
	Delete(collection string, id int) error
	Commit() (IDs []string, err error)
	Rollback() error
}
