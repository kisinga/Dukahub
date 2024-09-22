package dbUtils

import (
	"context"
)

// MockDB is a mock implementation of DB.
// it stores all data in memory. The structure is a map of collections, where each collection is a map of IDs to documents.
type MockDB struct {
	data map[string]map[string]interface{}
}

// Close implements DB.
func (m *MockDB) Close() error {
	panic("unimplemented")
}

// Connect implements DB.
func (m *MockDB) Connect() error {
	panic("unimplemented")
}

// DeleteAll implements DB.
func (m *MockDB) DeleteAll(collection string, query interface{}) error {
	panic("unimplemented")
}

// DeleteOne implements DB.
func (m *MockDB) DeleteOne(collection string, query interface{}) error {
	panic("unimplemented")
}

// FindAll implements DB.
func (m *MockDB) FindAll(collection string, query interface{}, result interface{}) error {
	panic("unimplemented")
}

// FindOne implements DB.
func (m *MockDB) FindOne(collection string, query interface{}, result interface{}) error {
	panic("unimplemented")
}

// InsertOne implements DB.
func (m *MockDB) InsertOne(collection string, data interface{}) error {
	panic("unimplemented")
}

// NewTransation implements DB.
func (m *MockDB) NewTransation(ctx context.Context, validate bool) (transactionMethods, error) {
	panic("unimplemented")
}

// UpdateOne implements DB.
func (m *MockDB) UpdateOne(collection string, query interface{}, update interface{}) error {
	panic("unimplemented")
}

func NewMockDB() crudMethods {
	return &MockDB{}
}
