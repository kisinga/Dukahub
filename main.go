package main

import (
	"log"
	"os"
	"path/filepath"
	"strings"
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
		},
	)

	var wg sync.WaitGroup

	mydb := dbUtils.New(pb)

	_, err := createHandlers(mydb)
	if err != nil {
		log.Fatal(err)
	}

	public := publicFolder()
	log.Default().Printf("Serving index file: %s", public)

	pb.OnBeforeServe().Add(func(e *core.ServeEvent) error {
		e.Router.GET("/*", apis.StaticDirectoryHandler(os.DirFS(public), true))
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

func publicFolder() string {
	publicFolderPath := os.Getenv("PUBLIC_FOLDER_PATH")
	if publicFolderPath == "" {
		_, withGoRun := inspectRuntime()
		if withGoRun {
			// we are running with go run
			log.Println("Running with go run, using frontend/dist/browser as public folder")
			publicFolderPath = "frontend/dist/browser"
		} else {
			log.Fatal("PUBLIC_FOLDER_PATH not set and not running with go run")
		}
	}

	// convert all paths to absolute path
	absPath, err := filepath.Abs(publicFolderPath)
	if err != nil {
		log.Fatal(err)
	}
	return absPath
}

func inspectRuntime() (baseDir string, withGoRun bool) {
	if strings.HasPrefix(os.Args[0], os.TempDir()) {
		// probably ran with go run
		withGoRun = true
		baseDir, _ = os.Getwd()
	} else {
		// probably ran with go build
		withGoRun = false
		baseDir = filepath.Dir(os.Args[0])
	}
	return
}
