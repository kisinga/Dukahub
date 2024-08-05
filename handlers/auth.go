package handlers

import (
	"github.com/kisinga/pantrify/frontend/pages"
	dbUtils "github.com/kisinga/pocketbase-utils"
	"github.com/labstack/echo/v5"
)

// By keeping an independent handler for each route, we can easily have separetion of concerns
// and also keep the codebase maintainable and readable.
// This is also good for testing as we can easily test each handler independently.
type AuthHandler struct {
	db dbUtils.DB
}

func NewAutuhHandler(db dbUtils.DB) *AuthHandler {
	return &AuthHandler{db: db}
}

func (h *AuthHandler) RenderLogin(c echo.Context) error {
	return render(c, pages.Login())
}
