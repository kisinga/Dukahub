package lib

import (
	"log"

	"github.com/pocketbase/pocketbase"
)

type DbHelper struct {
	Pb     *pocketbase.PocketBase
	Logger *log.Logger
}
