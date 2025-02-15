package main

import (
	"log"
	"os"

	"github.com/gobeli/pocketbase-htmx/lib"
	"github.com/gobeli/pocketbase-htmx/views"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

const AuthCookieName = "Auth"

func main() {
	app := pocketbase.New()

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		// serves static files from the provided public dir (if exists)
		se.Router.GET("/public", apis.Static(os.DirFS("/public"), false))
		se.Router.GET("/", func(c *core.RequestEvent) error {
			return lib.Render(c, views.BaseLayout())
		})

		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
	// serves static files from the provided public dir (if exists)
	// pb.OnBeforeServe().Add(func(e *core.ServeEvent) error {
	// 	e.Router.Static("/public", "public")

	// 	authGroup := e.Router.Group("/auth", middleware.LoadAuthContextFromCookie(pb))
	// 	auth.RegisterLoginRoutes(e, *authGroup)
	// 	auth.RegisterRegisterRoutes(e, *authGroup)

	// 	app.InitAppRoutes(e, pb)
	// 	return nil
	// })

	// if err := pb.Start(); err != nil {
	// 	log.Fatal(err)
	// }
}
