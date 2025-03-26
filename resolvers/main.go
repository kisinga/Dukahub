package resolvers

import (
	"github.com/kisinga/dukahub/lib"
	"github.com/pocketbase/pocketbase/core"
)

type Resolver interface {
	Resolve(c *core.RequestEvent) error
}

type Resolvers struct {
	helper lib.DbHelper
}

func NewResolvers(helper lib.DbHelper) *Resolvers {
	return &Resolvers{
		helper: helper,
	}
}
