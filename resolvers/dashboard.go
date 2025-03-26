package resolvers

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"

	"github.com/kisinga/dukahub/lib"
	"github.com/kisinga/dukahub/views/pages"
	"github.com/kisinga/dukahub/views/pages/dashboard"
	"github.com/pocketbase/pocketbase/core"
)

func (r *Resolvers) DashboardAuthCheck(e *core.RequestEvent) error {
	cookie, err := e.Request.Cookie("pb_users_auth")
	if err != nil {
		return e.Redirect(307, "/login")
	}
	user, err := r.helper.FindAuthRecordByToken(cookie.Value)
	if err != nil {
		return e.Redirect(http.StatusFound, "/login")
	}

	// Store user ID in request context
	e.Set("userID", user.Id)

	return e.Next()
}

func (r *Resolvers) DashboardHome(c *core.RequestEvent) error {
	userID := c.Get("userID")
	companyID := c.Request.PathValue("companyID")
	data, err := r.helper.FetchDashboardData(userID.(string), companyID)
	if err != nil {
		return c.Redirect(http.StatusFound, "/login")
	}
	return lib.Render(c, dashboard.Home(*data))
}

func (r *Resolvers) DashboardExport(c *core.RequestEvent) error {
	companyID := c.Request.PathValue("companyID")

	buf, err := r.helper.ExportPhotos(companyID)
	if err != nil {
		// Redirect on error
		c.Response.Header().Set("Location", "/admin-dashboard")
		c.Response.WriteHeader(http.StatusFound)
		return nil
	}

	// Set the proper headers for a downloadable zip file.
	c.Response.Header().Set("Content-Type", "application/zip")
	c.Response.Header().Set("Content-Disposition", "attachment; filename=\"export.zip\"")
	c.Response.Header().Set("Content-Length", strconv.Itoa(buf.Len()))

	// Write the zip content directly from the *bytes.Buffer.
	if _, err := io.Copy(c.Response, buf); err != nil {
		return err
	}
	return nil
}

func (r *Resolvers) DashboardRoot(e *core.RequestEvent) error {
	cookie, err := e.Request.Cookie("pb_auth")
	if err != nil {
		log.Println("No auth cookie found")
		return e.Redirect(307, "/login")
	}

	record, err := r.helper.FindAuthRecordByToken(cookie.Value)
	if err != nil {
		log.Println("No auth record found")
		return e.Redirect(http.StatusFound, "/login")
	}
	// route using the first company
	companies := record.GetStringSlice("company")
	if len(companies) == 0 {
		// no company, log error
		log.Println("No company found for user:", record.Id)
		// redirect to login
		return e.Redirect(307, "/login")
	}
	return e.Redirect(307, fmt.Sprintf("/dashboard/%s", companies[0]))
}

func (r *Resolvers) Sell(c *core.RequestEvent) error {
	userID := c.Get("userID")
	companyID := c.Request.PathValue("companyID")
	data, err := r.helper.FetchDashboardData(userID.(string), companyID)
	if err != nil {
		return c.Redirect(http.StatusFound, "/login")
	}
	return lib.Render(c, dashboard.Newsale(*data))
}

func (r *Resolvers) Register(c *core.RequestEvent) error {
	userID := c.Get("userID")
	companyID := c.Request.PathValue("companyID")
	data, err := r.helper.FetchDashboardData(userID.(string), companyID)
	if err != nil {
		return c.Redirect(http.StatusFound, "/login")
	}
	return lib.Render(c, pages.Register(*data))
}
