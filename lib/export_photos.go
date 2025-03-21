package lib

import (
	"bytes"

	"gocloud.dev/blob"
)

// A function that fetches photos for all the products of a company and zips them
// and returns a pointer to the zip file
func (helper *DbHelper) ExportPhotos(companyID string) (*bytes.Buffer, error) {
	// Fetch all the products for the company
	products, error := helper.fetchRawProductsById(companyID)
	if error != nil {
		return nil, error
	}
	if len(products) == 0 {
		helper.Logger.Println("No products found for company")
		return nil, nil
	}

	// initialize the filesystem
	fsys, err := helper.Pb.NewFilesystem()
	if err != nil {
		return nil, err
	}
	defer fsys.Close()

	blobs := make([]*blob.Reader, len(products))
	// retrieve a file reader for the each photo
	for _, product := range products {
		photoKey := product.BaseFilesPath() + "/" + product.GetString("photos")
		r, err := fsys.GetFile(photoKey)
		if err != nil {
			helper.Logger.Printf("Error getting file %s: %v", photoKey, err)
			continue
		}
		blobs = append(blobs, r)
		defer r.Close()
	}

	// create a zip file
	return createZip(blobs, helper.Logger)
}
