package lib

import (
	"bytes"

	"github.com/pocketbase/pocketbase/tools/filesystem/blob"
)

type FileInfo struct {
	Reader   *blob.Reader
	Filename string
}

// A function that fetches photos for all the products of a company and zips them
// and returns a pointer to the zip file
func (helper *DbHelper) ExportPhotos(companyID string) (*bytes.Buffer, error) {
	// Fetch all the products for the company
	products, error := helper.fetchRawProductsByCompanyId(companyID)
	if error != nil {
		return nil, error
	}
	if len(products) == 0 {
		helper.Logger.Println("No products found for company")
		return nil, nil
	}

	// initialize the filesystem
	fsys, err := helper.pb.NewFilesystem()
	if err != nil {
		return nil, err
	}
	defer fsys.Close()

	// Create a slice to store file information (reader and filename)

	files := []FileInfo{}

	// retrieve a file reader for each photo
	for _, product := range products {
		photosKeys := product.GetStringSlice("photos")
		if len(photosKeys) == 0 {
			helper.Logger.Println("No photos found for product")
			continue
		}

		for _, photoKey := range photosKeys {
			// generate the file path
			photoPath := product.BaseFilesPath() + "/" + photoKey
			r, err := fsys.GetFile(photoPath)
			if err != nil {
				helper.Logger.Printf("Error getting file %s: %v", photoPath, err)
				continue
			}

			// Add file to our collection with its original filename
			files = append(files, FileInfo{
				Reader:   r,
				Filename: photoPath, // This preserves the original filename and extension
			})
		}
	}

	// Close all file readers when the function returns
	defer func() {
		for _, file := range files {
			file.Reader.Close()
		}
	}()

	// create a zip file
	return createZip(files, helper.Logger)
}
