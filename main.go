package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"sync"

	handlersPackage "github.com/kisinga/pantrify/handlers"
	db "github.com/kisinga/pocketbase-utils"
	"github.com/labstack/echo/v5"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

//go:embed frontend/static/*
var static embed.FS

type allHandlers struct {
	homeHandler handlersPackage.HomeHandler
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

	handlers, err := createHandlers()
	if err != nil {
		log.Fatal(err)
	}

	mydb := db.New(pb)

	pb.OnBeforeServe().Add(func(e *core.ServeEvent) error {
		e.Router.GET("/", handlers.homeHandler.HandleHome, apis.ActivityLogger(pb))
		return nil
	})

	// Debugging: List embedded files
	fs.WalkDir(contentStatic, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			log.Println("Walking error:", err)
			return err
		}
		log.Println("Embedded file:", path)
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

func createHandlers() (allHandlers, error) {

	homeHandler := handlersPackage.HomeHandler{}

	return allHandlers{
		homeHandler: homeHandler,
	}, nil

}
