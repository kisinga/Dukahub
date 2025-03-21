package main

import (
	"embed"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"strconv"

	"github.com/kisinga/dukahub/lib"
	"github.com/kisinga/dukahub/models"
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
	helper := &lib.DbHelper{Pb: app, Logger: log.Default()}

	app.OnRecordAuthRequest("admins").BindFunc(func(e *core.RecordAuthRequestEvent) error {
		// Set HTTP-Only Auth Cookie
		e.RequestEvent.SetCookie(&http.Cookie{
			Name:     "pb_auth",
			Value:    e.Token,
			Path:     "/",
			HttpOnly: true,
			Secure:   true,
			SameSite: http.SameSiteLaxMode,
		})
		return e.Next()
	})

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		// serves static files from the provided public dir (if exists)
		se.Router.GET("/public/{path...}", apis.Static(GetPublicFS(), false))

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
				log.Println("No auth cookie found")
				return e.Redirect(307, "/login")
			}

			record, err := app.FindAuthRecordByToken(cookie.Value)
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
			companyID := c.Request.PathValue("companyID")
			data, err := helper.FetchDashboardData(userID.(string), companyID)
			if err != nil {
				return c.Redirect(http.StatusFound, "/login")
			}
			return lib.Render(c, pages.Newsale(*data))
		})

		dashboardGroup.GET("/register", func(c *core.RequestEvent) error {
			userID := c.Get("userID")
			companyID := c.Request.PathValue("companyID")
			data, err := helper.FetchDashboardData(userID.(string), companyID)
			if err != nil {
				return c.Redirect(http.StatusFound, "/login")
			}
			return lib.Render(c, pages.Register(*data))
		})

		dashboardGroup.GET("/export", func(c *core.RequestEvent) error {
			companyID := c.Request.PathValue("companyID")

			buf, err := helper.ExportPhotos(companyID)
			if err != nil {
				// Redirect on error
				c.Response.Header().Set("Location", "/login")
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
		})

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
