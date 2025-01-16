package main

import (
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"

	handlersPackage "github.com/kisinga/pantrify/handlers"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

// by cteating a customHandlers struct, we can easily match the handlers to the routes
// and we ensure that we have a single instance of each handler
// we are guaranteed that all handlers are created in the same place
type customHandlers struct {
	toggledayoperationstate *handlersPackage.ToggleDayOperationStateHandler
}

func main() {
	pb := pocketbase.NewWithConfig(
		pocketbase.Config{
			DefaultDev:      true,
			HideStartBanner: false,
		},
	)

	// create a global waitgroup in case we want to run several "main" threads
	var wg sync.WaitGroup

	// By creating global handlers, we can easily match them to the routes
	handlers, err := createHandlers(pb)
	if err != nil {
		log.Fatal(err)
	}

	public := publicFolder()
	log.Default().Printf("Serving index file: %s", public)

	pb.OnServe().BindFunc(func(e *core.ServeEvent) error {
		e.Router.POST("/toggledayoperationstate", handlers.toggledayoperationstate.Handle)
		return e.Next()
	})

	pb.OnServe().BindFunc(func(e *core.ServeEvent) error {
		e.Router.GET("/{path...}", apis.Static(os.DirFS(public), true))
		return e.Next()
	})
	// connect to the database
	wg.Add(1)
	go func() {
		defer wg.Done()
		pb.Start()
	}()

	wg.Wait()
}

func createHandlers(pb *pocketbase.PocketBase) (customHandlers, error) {

	toggleDayOperationsHandler := handlersPackage.NewToggleDayOperationStateHandler(pb)

	return customHandlers{
		toggledayoperationstate: toggleDayOperationsHandler,
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
