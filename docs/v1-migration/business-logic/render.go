package lib

import (
	"encoding/json"

	"github.com/a-h/templ"
	"github.com/pocketbase/pocketbase/core"
)

func Render(c *core.RequestEvent, component templ.Component) error {
	return component.Render(c.Request.Context(), c.Response)
}

func ReturnJSONError(c *core.RequestEvent, statusCode int, err error) error {
	c.Response.Header().Set("Content-Type", "application/json")
	c.Response.WriteHeader(statusCode)
	return json.NewEncoder(c.Response).Encode(map[string]string{"error": err.Error()})
}
