package admin

import (
	"io"
	"net/http"
	"strconv"

	"github.com/kisinga/dukahub/lib"
	"github.com/kisinga/dukahub/models"
	admindashboard "github.com/kisinga/dukahub/views/pages/adminDashboard"
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
	cookie, err := e.Request.Cookie("pb_admins_auth")
	if err != nil {
		return e.Redirect(307, "/admin-login")
	}
	admin, err := r.helper.FindAuthRecordByToken(cookie.Value)
	if err != nil {
		return e.Redirect(http.StatusFound, "/admin-login")
	}

	// Store user ID in request context
	e.Set("adminID", admin.Id)

	return e.Next()
}

func (r *Resolvers) Export(c *core.RequestEvent) error {
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

func (r *Resolvers) Home(c *core.RequestEvent) error {
	adminID := c.Get("adminID")
	admin, err := r.helper.FetchAdminById(adminID.(string))
	if err != nil {
		return c.Redirect(http.StatusFound, "/admin-login")
	}
	companies, err := r.helper.FetchAllCompanies()
	if err != nil {
		// Handle error, maybe log it and render the page with an empty list or an error message.
		// For now, redirect to admin-login if companies cannot be fetched
		return c.Redirect(http.StatusFound, "/admin-login")
	}

	var dashboardData []models.CompanyDashboardData
	for _, company := range companies {
		productsCount, err := r.helper.CountProductsByCompanyID(company.Id)
		if err != nil {
			// Handle error, log it, or set count to 0
			r.helper.Logger.Printf("Error counting products for company %s: %v", company.Id, err)
			productsCount = 0
		}

		usersCount, err := r.helper.CountUsersByCompanyID(company.Id)
		if err != nil {
			r.helper.Logger.Printf("Error counting users for company %s: %v", company.Id, err)
			usersCount = 0
		}

		accountsCount, err := r.helper.CountCompanyAccountsByCompanyID(company.Id)
		if err != nil {
			r.helper.Logger.Printf("Error counting accounts for company %s: %v", company.Id, err)
			accountsCount = 0
		}

		partnersCount, err := r.helper.CountPartnersByCompanyID(company.Id)
		if err != nil {
			r.helper.Logger.Printf("Error counting partners for company %s: %v", company.Id, err)
			partnersCount = 0
		}

		dashboardData = append(dashboardData, models.CompanyDashboardData{
			Company:       company,
			ProductsCount: productsCount,
			UsersCount:    usersCount,
			AccountsCount: accountsCount,
			PartnersCount: partnersCount,
		})
	}

	return lib.Render(c, admindashboard.Home(admin, dashboardData))
}

func (r *Resolvers) Analytics(c *core.RequestEvent) error {
	adminID := c.Get("adminID")
	admin, err := r.helper.FetchAdminById(adminID.(string))
	if err != nil {
		return c.Redirect(http.StatusFound, "/admin-login")
	}
	return lib.Render(c, admindashboard.Analytics(admin))
}
