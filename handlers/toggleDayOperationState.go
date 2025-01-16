package handlers

import (
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

type ToggleDayOperationStateHandler struct {
	crudUtils *pocketbase.PocketBase
}

func NewToggleDayOperationStateHandler(db *pocketbase.PocketBase) *ToggleDayOperationStateHandler {
	return &ToggleDayOperationStateHandler{crudUtils: db}
}

func (h *ToggleDayOperationStateHandler) Handle(e *core.RequestEvent) error {
	// handle the request here
	return nil
}
