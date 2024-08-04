package handlers

import (
	dbUtils "github.com/kisinga/pocketbase-utils"
	"github.com/labstack/echo/v5"
)

// By keeping an independent handler for each route, we can easily have separetion of concerns
// and also keep the codebase maintainable and readable.
// This is also good for testing as we can easily test each handler independently.
type loginHandler struct {
	db dbUtils.DB
}

func NewLoginHandler(db dbUtils.DB) *loginHandler {
	return &loginHandler{db: db}
}

func (h *loginHandler) HandleLogin(c echo.Context) error {
	return nil
}
