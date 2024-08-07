package handlers

import (
	dbUtils "github.com/kisinga/pocketbase-utils"
)

// By keeping an independent handler for each route, we can easily have separetion of concerns
// and also keep the codebase maintainable and readable.
// This is also good for testing as we can easily test each handler independently.
type CustomHandler struct {
	crudUtils dbUtils.DB
}

func NewCustomHandler(db dbUtils.DB) *CustomHandler {
	return &CustomHandler{crudUtils: db}
}
