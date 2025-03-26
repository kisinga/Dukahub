package dashboard

import (
	"fmt"
	"log"
	"net/http"

	"github.com/kisinga/dukahub/lib"
	"github.com/kisinga/dukahub/views/pages"
	"github.com/kisinga/dukahub/views/pages/dashboard"
	"github.com/pocketbase/pocketbase/core"
)

type Resolvers struct {
	helper *lib.DbHelper
}

func NewResolvers(helper *lib.DbHelper) *Resolvers {
	return &Resolvers{
		helper: helper,
	}
}

func (r *Resolvers) AuthCheck(e *core.RequestEvent) error {
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

func (r *Resolvers) Home(c *core.RequestEvent) error {
	userID := c.Get("userID")
	companyID := c.Request.PathValue("companyID")
	data, err := r.helper.FetchDashboardData(userID.(string), companyID)
	if err != nil {
		return c.Redirect(http.StatusFound, "/login")
	}
	return lib.Render(c, dashboard.Home(*data))
}

func (r *Resolvers) Root(e *core.RequestEvent) error {
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
