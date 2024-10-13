package handlers

import (
	dbUtils "github.com/kisinga/pocketbase-utils"
	"github.com/labstack/echo/v5"
)

type ToggleDayOperationStateHandler struct {
	crudUtils dbUtils.DB
}

func NewToggleDayOperationStateHandler(db dbUtils.DB) *ToggleDayOperationStateHandler {
	return &ToggleDayOperationStateHandler{crudUtils: db}
}

func (h *ToggleDayOperationStateHandler) Handle(c echo.Context) error {
	// handle the request here
	return nil
}
