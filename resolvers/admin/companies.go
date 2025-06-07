package admin

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/kisinga/dukahub/lib"
	"github.com/kisinga/dukahub/models"
	"github.com/pocketbase/pocketbase/core"
)

type CompaniesResolver struct {
	helper *lib.DbHelper
}

func NewCompaniesResolver(helper *lib.DbHelper) *CompaniesResolver {
	return &CompaniesResolver{
		helper: helper,
	}
}

func (r *CompaniesResolver) CreateCompany(c *core.RequestEvent) error {
	adminID := c.Get("adminID")
	if adminID == nil {
		return c.Redirect(http.StatusFound, "/admin-login")
	}

	var newCompany models.Companies
	if err := json.NewDecoder(c.Request.Body).Decode(&newCompany); err != nil {
		return lib.ReturnJSONError(c, http.StatusBadRequest, fmt.Errorf("failed to decode company data: %w", err))
	}

	company, err := r.helper.CreateCompany(&newCompany)
	if err != nil {
		return lib.ReturnJSONError(c, http.StatusInternalServerError, fmt.Errorf("failed to create company: %w", err))
	}

	return c.JSON(http.StatusCreated, company)
}

func (r *CompaniesResolver) UpdateCompany(c *core.RequestEvent) error {
	adminID := c.Get("adminID")
	if adminID == nil {
		return c.Redirect(http.StatusFound, "/admin-login")
	}

	companyID := c.Request.PathValue("companyID")
	if companyID == "" {
		return lib.ReturnJSONError(c, http.StatusBadRequest, fmt.Errorf("company ID is missing"))
	}

	var updatedCompany models.Companies
	if err := json.NewDecoder(c.Request.Body).Decode(&updatedCompany); err != nil {
		return lib.ReturnJSONError(c, http.StatusBadRequest, fmt.Errorf("failed to decode company data: %w", err))
	}

	company, err := r.helper.UpdateCompany(companyID, &updatedCompany)
	if err != nil {
		return lib.ReturnJSONError(c, http.StatusInternalServerError, fmt.Errorf("failed to update company: %w", err))
	}

	return c.JSON(http.StatusOK, company)
}

func (r *CompaniesResolver) DeleteCompany(c *core.RequestEvent) error {
	adminID := c.Get("adminID")
	if adminID == nil {
		return c.Redirect(http.StatusFound, "/admin-login")
	}

	companyID := c.Request.PathValue("companyID")
	if companyID == "" {
		return lib.ReturnJSONError(c, http.StatusBadRequest, fmt.Errorf("company ID is missing"))
	}

	if err := r.helper.DeleteCompany(companyID); err != nil {
		return lib.ReturnJSONError(c, http.StatusInternalServerError, fmt.Errorf("failed to delete company: %w", err))
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Company deleted successfully"})
}
