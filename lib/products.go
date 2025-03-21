package lib

import (
	"fmt"

	"github.com/kisinga/dukahub/models"
	"github.com/pocketbase/pocketbase/core"
)

func (helper *DbHelper) FetchProductsById(id string) (*models.Products, error) {
	record, error := helper.Pb.FindRecordById("products", id)
	if error != nil {
		return nil, error
	}
	return models.WrapRecord[models.Products](record)
}

func (helper *DbHelper) fetchRawProductsByCompanyId(companyID string) ([]*core.Record, error) {
	records, error := helper.Pb.FindRecordsByFilter(
		"products",
		fmt.Sprintf("company = '%s'", companyID),
		"-created",
		0,
		0,
	)

	return records, error
}

func (helper *DbHelper) FetchProductsByCompanyId(companyID string, generatePhotoURL bool) ([]*models.Products, error) {
	records, error := helper.Pb.FindRecordsByFilter(
		"products",
		fmt.Sprintf("company = '%s'", companyID),
		"-created",
		0,
		0,
	)

	if error != nil {
		return nil, error
	}
	products := make([]*models.Products, len(records))
	for i, record := range records {
		product, error := models.WrapRecord[models.Products](record)
		if error != nil {
			return nil, error
		}
		if generatePhotoURL {
			photoURLs := make([]string, len(product.Photos()))
			for j, photo := range product.Photos() {
				photoURLs[j] = generateImageUrl(models.CName[models.Products](), product.Id, photo, ThumnailSize{Width: 100, Height: 100})
			}
			product.SetPhotos(photoURLs)
		}
		products[i] = product
	}
	return products, nil
}
