package lib

import (
	"github.com/a-h/templ"
	"github.com/pocketbase/pocketbase/core"
)

func Render(c *core.RequestEvent, component templ.Component) error {
	return component.Render(c.Request.Context(), c.Response)
}
