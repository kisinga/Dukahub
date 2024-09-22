package dbUtils

import (
	"context"
	"fmt"
	"mime/multipart"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/daos"
	"github.com/pocketbase/pocketbase/forms"
	"github.com/pocketbase/pocketbase/models"
	"github.com/pocketbase/pocketbase/tools/filesystem"
)

type transaction struct {
	pocketbase *pocketbase.PocketBase
	validate   bool
	txDAO      *daos.Dao
	operations []func(app *pocketbase.PocketBase, txDAO *daos.Dao) (ID string, err error)
}

// DeleteAll implements DB.
func (d *DB) DeleteAll(collection string, query interface{}) error {
	panic("unimplemented")
}

// DeleteOne implements DB.
func (d *DB) DeleteOne(collection string, query interface{}) error {
	panic("unimplemented")
}

// FindAll implements DB.
func (d *DB) FindAll(collection string, query interface{}, result interface{}) error {
	panic("unimplemented")
}

// FindOne implements DB.
func (d *DB) FindOne(collection string, query interface{}, result interface{}) error {
	panic("unimplemented")
}

// InsertOne implements DB.
func (d *DB) InsertOne(collection string, data interface{}) error {
	panic("unimplemented")
}

// UpdateOne implements DB.
func (d *DB) UpdateOne(collection string, query interface{}, update interface{}) error {
	panic("unimplemented")
}

// Commit implements Transaction.
func (t *transaction) Commit() (IDs []string, err error) {
	// Run the operations in a transaction
	IDs = make([]string, len(t.operations))
	t.pocketbase.Dao().RunInTransaction(func(txDAO *daos.Dao) error {
		for _, operation := range t.operations {
			ID, err := operation(t.pocketbase, txDAO)
			if err != nil {
				return err
			}
			IDs = append(IDs, ID)
		}
		return nil
	})
	return IDs, err
}

// Add implements Transaction.
func (t *transaction) Add(collection string, data interface{}) error {
	t.operations = append(t.operations, func(app *pocketbase.PocketBase, txDAO *daos.Dao) (ID string, err error) {
		return transationCreate(app, txDAO, collection, data, t.validate)
	})
	return nil
}

// Delete implements Transaction.
func (t *transaction) Delete(collection string, id int) error {
	panic("unimplemented")
}

// Read implements Transaction.
func (t *transaction) Read(collection string, data interface{}) error {
	panic("unimplemented")
}

// Rollback implements Transaction.
func (t *transaction) Rollback() error {
	panic("unimplemented")
}

// Update implements Transaction.
func (t *transaction) Update(collection string, data interface{}) error {
	panic("unimplemented")
}

func New(pb *pocketbase.PocketBase) DB {
	if pb == nil {
		return DB{
			PB: pocketbase.New(),
		}
	} else {
		return DB{
			PB: pb,
		}
	}
}

func (d *DB) NewTransation(ctx context.Context, validate bool) (transactionMethods, error) {
	return &transaction{
		pocketbase: d.PB,
		validate:   validate,
	}, nil
}

func (d *DB) Connect() error {
	return d.PB.Start()
}

func (d *DB) Close() error {
	return d.Close()
}

// transationCreate is a helper function that creates a record from a struct pointer in a transaction.
// It converts the struct to a map and creates a record in the database.
// It submits files as part of the form data, setting the ID of the record in the original struct.
func transationCreate(app *pocketbase.PocketBase, txDAO *daos.Dao, collectionName string, item interface{}, validate bool) (ID string, err error) {
	defer func() {
		if r := recover(); r != nil {
			fmt.Println("Recovered in createRecordInTransaction", r)
		}
	}()
	mapData, err := structToMap(item)
	if err != nil {
		return "", err
	}

	collection, err := txDAO.FindCollectionByNameOrId(collectionName)
	if err != nil {
		return "", err
	}
	record := models.NewRecord(collection)

	if validate {
		form := forms.NewRecordUpsert(app, record)
		form.SetDao(txDAO)
		if err != nil {
			return "", err
		}
		// Go through the values and add any file to the form as a file
		for key, value := range mapData {
			if file, ok := value.(*multipart.FileHeader); ok {
				file, err := filesystem.NewFileFromMultipart(file)
				if err != nil {
					return "", err
				}
				form.AddFiles(key, file)
				err = form.Submit()
				if err != nil {
					return "", err
				}

				delete(mapData, key)
			}
		}
		err = form.LoadData(mapData)
		if err != nil {
			return "", err
		}
		err = form.Submit()
		if err != nil {
			return "", err
		}

	} else {
		for key, value := range mapData {
			record.Set(key, value)
		}
	}
	return record.GetId(), nil
}
