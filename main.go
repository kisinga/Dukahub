package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"sync"

	handlersPackage "github.com/kisinga/pantrify/handlers"
	dbUtils "github.com/kisinga/pocketbase-utils"
	"github.com/labstack/echo/v5"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

//go:embed frontend/static/*
var static embed.FS

type allHandlers struct {
	homeHandler *handlersPackage.HomeHandler
	authHandler *handlersPackage.AuthHandler
}

func main() {
	pb := pocketbase.NewWithConfig(
		pocketbase.Config{
			DefaultDev:      true,
			HideStartBanner: false,
		},
	)

	contentStatic, err := fs.Sub(static, "frontend/static")
	if err != nil {
		log.Fatal(err)
	}

	var wg sync.WaitGroup

	if err != nil {
		log.Fatal(err)
	}

	mydb := dbUtils.New(pb)

	handlers, err := createHandlers(mydb)

	pb.OnBeforeServe().Add(func(e *core.ServeEvent) error {
		e.Router.GET("/", handlers.homeHandler.RenderHome, apis.ActivityLogger(pb))
		return nil
	})

	pb.OnBeforeServe().Add(func(e *core.ServeEvent) error {
		e.Router.GET("/login", handlers.authHandler.RenderLogin, apis.ActivityLogger(pb))
		return nil
	})

	pb.OnBeforeServe().Add(func(e *core.ServeEvent) error {
		e.Router.GET("/static/*", echo.WrapHandler(http.StripPrefix("/static/", http.FileServer(http.FS(contentStatic)))), apis.ActivityLogger(pb))
		return nil
	})
	// connect to the database
	wg.Add(1)
	go func() {
		defer wg.Done()
		mydb.Connect()
	}()

	wg.Wait()
}

func createHandlers(db dbUtils.DB) (allHandlers, error) {

	homeHandler := handlersPackage.HomeHandler{}
	authHandler := handlersPackage.NewAutuhHandler(db)

	return allHandlers{
		homeHandler: &homeHandler,
		authHandler: authHandler,
	}, nil

}
