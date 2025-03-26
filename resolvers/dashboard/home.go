package dashboard

import (
	"net/http"

	"github.com/kisinga/dukahub/lib"
	"github.com/kisinga/dukahub/views/pages/dashboard"
	"github.com/pocketbase/pocketbase/core"
)

func (r *Resolvers) Home(c *core.RequestEvent) error {
	userID := c.Get("userID")
	companyID := c.Request.PathValue("companyID")
	data, err := r.helper.FetchDashboardData(userID.(string), companyID)
	if err != nil {
		return c.Redirect(http.StatusFound, "/login")
	}
	return lib.Render(c, dashboard.Home(data))
}
