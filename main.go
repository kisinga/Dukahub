package main

import (
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

		dashboardGroup := se.Router.Group("/dashboard")
		// extract the cookie and set the Auth object
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

		dashboardGroup.GET("/", func(c *core.RequestEvent) error {
			userID := c.Get("userID")
			data, err := helper.FetchDashboardData(userID.(string))
			if err != nil {
				return c.Redirect(http.StatusFound, "/login")
			}
			return lib.Render(c, pages.Dashboard(*data))
		})

		dashboardGroup.GET("/new_sale", func(c *core.RequestEvent) error {
			userID := c.Get("userID")
			data, err := helper.FetchDashboardData(userID.(string))
			if err != nil {
				return c.Redirect(http.StatusFound, "/login")
			}
			return lib.Render(c, pages.Newsale(*data))
		})

		dashboardGroup.PUT("/activecompany", func(c *core.RequestEvent) error {
			userID := c.Get("userID")
			data, err := helper.FetchDashboardData(userID.(string))
			if err != nil {
				return c.Redirect(http.StatusFound, "/login")
			}
			return lib.Render(c, pages.Dashboard(*data))
		})

		se.Router.GET("/login", func(c *core.RequestEvent) error {
			return lib.Render(c, pages.Login(models.LoginFormValue{}, nil))
		})

		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
