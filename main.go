package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"

	"github.com/kisinga/dukahub/lib"
	"github.com/kisinga/dukahub/models"
	"github.com/kisinga/dukahub/resolvers"
	"github.com/kisinga/dukahub/views/pages"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

const AuthCookieName = "Auth"

//go:embed public
var embeddedFiles embed.FS

func main() {
	app := pocketbase.New()
	helper := lib.NewDbHelper(app, log.Default())

	app.OnRecordAuthRequest("users").BindFunc(func(e *core.RecordAuthRequestEvent) error {
		// Set HTTP-Only Auth Cookie
		e.RequestEvent.SetCookie(&http.Cookie{
			Name:     "pb_users_auth",
			Value:    e.Token,
			Path:     "/",
			HttpOnly: true,
			Secure:   true,
			SameSite: http.SameSiteLaxMode,
		})
		return e.Next()
	})

	app.OnRecordAuthRequest("admins").BindFunc(func(e *core.RecordAuthRequestEvent) error {
		// Set HTTP-Only Auth Cookie
		e.RequestEvent.SetCookie(&http.Cookie{
			Name:     "pb_admins_auth",
			Value:    e.Token,
			Path:     "/",
			HttpOnly: true,
			Secure:   true,
			SameSite: http.SameSiteLaxMode,
		})
		return e.Next()
	})

	resolvers := resolvers.NewResolvers(*helper)

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		// serves static files from the provided public dir (if exists)
		se.Router.GET("/public/{path...}", apis.Static(GetPublicFS(), false))

		se.Router.GET("/", func(c *core.RequestEvent) error {
			return lib.Render(c, pages.Home())
		})
		se.Router.GET("/login", func(c *core.RequestEvent) error {
			return lib.Render(c, pages.Login(models.Dashboard))
		})

		se.Router.GET("/admin-login", func(c *core.RequestEvent) error {
			return lib.Render(c, pages.Login(models.AdminDashboard))
		})

		adminDashboardGroup := se.Router.Group("/admin-dashboard")
		adminDashboardGroup.BindFunc(resolvers.AdminDashboardAuthCheck)

		adminDashboardGroup.GET("/", resolvers.DashboardHome)

		adminDashboardGroup.GET("/export/{companyID}", resolvers.DashboardExport)

		// route for when someone navigates to dashboard without a company
		se.Router.GET("/dashboard/{$}", resolvers.DashboardRoot)

		dashboardGroup := se.Router.Group("/dashboard/{companyID}")

		// For every dashboard route, check if user is logged in and forward the userID through the context
		dashboardGroup.BindFunc(resolvers.DashboardAuthCheck)

		// root dashboard route with a valid companyID
		dashboardGroup.GET("/", resolvers.DashboardHome)

		dashboardGroup.GET("/sell", resolvers.Sell)

		dashboardGroup.GET("/register", resolvers.Register)

		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

// GetPublicFS returns a filesystem with just the public directory.
// This is necessary because we embed the whole "public" directory,
// but the HTTP handler needs the filesystem to be rooted at "public".
func GetPublicFS() fs.FS {
	// Strip the "public" prefix to get the root filesystem
	publicFS, err := fs.Sub(embeddedFiles, "public")
	if err != nil {
		panic(err)
	}
	return publicFS
}
