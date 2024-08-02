package main

import (
	"embed"
	"io/fs"
	"log"
	"sync"

	db "github.com/kisinga/pocketbase-utils"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

//go:embed public
var public embed.FS

func main() {
	pb := pocketbase.NewWithConfig(
		pocketbase.Config{
			DefaultDev:      true,
			HideStartBanner: false,
		},
	)

	contentStatic, err := fs.Sub(public, "public")
	if err != nil {
		log.Fatal(err)
	}

	pb.OnBeforeServe().Add(func(e *core.ServeEvent) error {
		e.Router.GET("/*", apis.StaticDirectoryHandler(contentStatic, true))
		return nil
	})

	mydb := db.New(pb)
	var wg sync.WaitGroup

	// connect to the database
	wg.Add(1)
	go func() {
		defer wg.Done()
		mydb.Connect()
	}()

	wg.Wait()
}
