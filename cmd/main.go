package main

import (
	"sync"

	"github.com/kisinga/pocketbase-utils"
	"github.com/pocketbase/pocketbase"
)

func main() {
	pb := pocketbase.NewWithConfig(
		pocketbase.Config{
			DefaultDev:      true,
			HideStartBanner: false,
		},
	)
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
