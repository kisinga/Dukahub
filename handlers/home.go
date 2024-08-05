package handlers

import (
	"github.com/kisinga/pantrify/frontend/pages"
	"github.com/labstack/echo/v5"
)

// By keeping an independent handler for each route, we can easily have separetion of concerns
// and also keep the codebase maintainable and readable.
// This is also good for testing as we can easily test each handler independently.
type HomeHandler struct{}

func (h *HomeHandler) RenderHome(c echo.Context) error {
	return render(c, pages.Root())
}
