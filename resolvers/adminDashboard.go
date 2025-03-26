package resolvers

import (
	"net/http"

	"github.com/kisinga/dukahub/lib"
	admindashboard "github.com/kisinga/dukahub/views/pages/adminDashboard"
	"github.com/pocketbase/pocketbase/core"
)

func (r *Resolvers) AdminDashboardAuthCheck(e *core.RequestEvent) error {
	cookie, err := e.Request.Cookie("pb_admins_auth")
	if err != nil {
		return e.Redirect(307, "/admin-login")
	}
	user, err := r.helper.FindAuthRecordByToken(cookie.Value)
	if err != nil {
		return e.Redirect(http.StatusFound, "/admin-login")
	}

	// Store user ID in request context
	e.Set("adminID", user.Id)

	return e.Next()
}

func (r *Resolvers) AdminDashboardHome(c *core.RequestEvent) error {
	adminID := c.Get("adminID")
	admin, err := r.helper.FetchAdminById(adminID.(string))
	if err != nil {
		return c.Redirect(http.StatusFound, "/admin-login")
	}
	return lib.Render(c, admindashboard.Home(admin))
}
