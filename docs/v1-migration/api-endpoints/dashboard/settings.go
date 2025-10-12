package dashboard

import (
	"net/http"

	"github.com/kisinga/dukahub/lib"
	"github.com/kisinga/dukahub/models"
	"github.com/kisinga/dukahub/views/pages/dashboard"
	"github.com/pocketbase/pocketbase/core"
)

func (r *Resolvers) CompanySettings(c *core.RequestEvent) error {
	userID := c.Get("userID")
	companyID := c.Request.PathValue("companyID")

	user, err := r.helper.FetchExpandedUserById(userID.(string))
	if err != nil {
		return c.Redirect(http.StatusFound, "/login")
	}

	activeCompany := &models.Companies{}

	for _, company := range user.Company() {
		if company.Id == companyID {
			activeCompany = company
			break
		}
	}

	return lib.Render(c, dashboard.CompanySettings(user, activeCompany))
}
