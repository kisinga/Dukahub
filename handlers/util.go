package handlers

import (
	"github.com/a-h/templ"
	"github.com/labstack/echo/v5"
)

func render(c echo.Context, component templ.Component) error {
	return component.Render(c.Request().Context(), c.Response())
}
