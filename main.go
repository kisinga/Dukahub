package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/kisinga/dukahub/lib"
	"github.com/kisinga/dukahub/models"
	"github.com/kisinga/dukahub/views/pages"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

const AuthCookieName = "Auth"

func main() {
	app := pocketbase.New()
	helper := &lib.DbHelper{Pb: app}

	app.OnRecordAuthRequest("admins").BindFunc(func(e *core.RecordAuthRequestEvent) error {
		// Set HTTP-Only Auth Cookie
		e.RequestEvent.SetCookie(&http.Cookie{
			Name:     "pb_auth",
			Value:    e.Token,
			Path:     "/",
			HttpOnly: true,
			Secure:   true, // Use HTTPS in production
			SameSite: http.SameSiteLaxMode,
		})
		println("Auth Token:", e.Token)
		return e.Next()
	})

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		// serves static files from the provided public dir (if exists)
		se.Router.GET("/public/{path...}", apis.Static(os.DirFS("public"), false))

		se.Router.GET("/", func(c *core.RequestEvent) error {
			return lib.Render(c, pages.Home())
		})
		se.Router.GET("/login", func(c *core.RequestEvent) error {
			return lib.Render(c, pages.Login(models.LoginFormValue{}, nil))
		})

		// route for when someone navigates to dashboard without a company
		se.Router.GET("/dashboard/{$}", func(e *core.RequestEvent) error {
			cookie, err := e.Request.Cookie("pb_auth")
			if err != nil {
				return e.Redirect(307, "/login")
			}

			record, err := app.FindAuthRecordByToken(cookie.Value)
			if err != nil {
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
		})

		dashboardGroup := se.Router.Group("/dashboard/{companyID}")

		// For every dashboard route, check if user is logged in and forward the userID through the context
		dashboardGroup.BindFunc(func(e *core.RequestEvent) error {
			cookie, err := e.Request.Cookie("pb_auth")
			if err != nil {
				return e.Redirect(307, "/login")
			}
			user, err := app.FindAuthRecordByToken(cookie.Value)
			if err != nil {
				return e.Redirect(http.StatusFound, "/login")
			}

			// Store user ID in request context
			e.Set("userID", user.Id)

			return e.Next()
		})

		// root dashboard route with a valid companyID
		dashboardGroup.GET("/", func(c *core.RequestEvent) error {
			userID := c.Get("userID")
			companyID := c.Request.PathValue("companyID")
			data, err := helper.FetchDashboardData(userID.(string), companyID)
			if err != nil {
				return c.Redirect(http.StatusFound, "/login")
			}
			return lib.Render(c, pages.Dashboard(*data))
		})

		dashboardGroup.GET("/sell", func(c *core.RequestEvent) error {
			userID := c.Get("userID")
			data, err := helper.FetchDashboardData(userID.(string), "")
			if err != nil {
				return c.Redirect(http.StatusFound, "/login")
			}
			return lib.Render(c, pages.Newsale(*data))
		})

		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
