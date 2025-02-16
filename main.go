package main

import (
	"log"
	"os"

	"github.com/kisinga/dukahub/lib"
	"github.com/kisinga/dukahub/models"
	"github.com/kisinga/dukahub/views"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

const AuthCookieName = "Auth"

func main() {
	app := pocketbase.New()

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		// serves static files from the provided public dir (if exists)
		se.Router.GET("/public/{path...}", apis.Static(os.DirFS("public"), false))

		se.Router.GET("/", func(c *core.RequestEvent) error {
			return lib.Render(c, views.BaseLayout())
		})

		se.Router.GET("/dashboard", func(c *core.RequestEvent) error {
			return lib.Render(c, views.DashboardLayout())
		})

		se.Router.GET("/login", func(c *core.RequestEvent) error {
			return lib.Render(c, views.Login(models.LoginFormValue{}, nil))
		})

		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
