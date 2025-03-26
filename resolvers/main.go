package resolvers

import (
	"github.com/kisinga/dukahub/lib"
	"github.com/kisinga/dukahub/resolvers/admin"
	"github.com/kisinga/dukahub/resolvers/dashboard"
	"github.com/pocketbase/pocketbase/core"
)

type Resolver interface {
	Resolve(c *core.RequestEvent) error
}

type Resolvers struct {
	helper    *lib.DbHelper
	Dashboard *dashboard.Resolvers
	Admin     *admin.Resolvers
}

func NewResolvers(helper *lib.DbHelper) *Resolvers {
	return &Resolvers{
		helper:    helper,
		Dashboard: dashboard.NewResolvers(helper),
		Admin:     admin.NewResolvers(helper),
	}
}
