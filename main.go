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

	app.OnRecordAuthRequest().BindFunc(func(e *core.RecordAuthRequestEvent) error {
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
			println("User:", user)
			return e.Next()
		})

		dashboardGroup.GET("/", func(c *core.RequestEvent) error {

			return lib.Render(c, pages.Dashboard())
		})

		se.Router.GET("/login", func(c *core.RequestEvent) error {
			// if c.Auth == nil {
			// 	return c.Redirect(307, "/dashboard")
			// }
			return lib.Render(c, pages.Login(models.LoginFormValue{}, nil))
		})

		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
