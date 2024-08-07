package main

import (
	"log"
	"os"
	"path/filepath"
	"sync"

	handlersPackage "github.com/kisinga/pantrify/handlers"
	dbUtils "github.com/kisinga/pocketbase-utils"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

type customHandlers struct {
	custom *handlersPackage.CustomHandler
}

func main() {
	pb := pocketbase.NewWithConfig(
		pocketbase.Config{
			DefaultDev:      true,
			HideStartBanner: false,
			DefaultDataDir:  "./data",
		},
	)

	var wg sync.WaitGroup

	mydb := dbUtils.New(pb)

	_, err := createHandlers(mydb)
	if err != nil {
		log.Fatal(err)
	}
	publicFolderPath := os.Getenv("PUBLIC_FOLDER_PATH")
	if publicFolderPath == "" {
		log.Default().Println("PUBLIC_FOLDER_PATH not set, defaulting to public")
		publicFolderPath = "public"
	} else {
		// convert to absolute path
		absPath, err := filepath.Abs(publicFolderPath)
		if err != nil {
			log.Fatal(err)
		}
		publicFolderPath = absPath
	}

	pb.OnBeforeServe().Add(func(e *core.ServeEvent) error {
		e.Router.GET("/*", apis.StaticDirectoryHandler(os.DirFS(publicFolderPath), false))
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

func createHandlers(utils dbUtils.DB) (customHandlers, error) {

	custom := handlersPackage.CustomHandler{}

	return customHandlers{
		custom: &custom,
	}, nil

}
