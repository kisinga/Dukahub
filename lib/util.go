package lib

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"log"

	"gocloud.dev/blob"
)

type ThumnailSize struct {
	Width  int
	Height int
}

// replace the existing logos with valid urls
// use this format http://127.0.0.1:8090/api/files/COLLECTION_ID_OR_NAME/RECORD_ID/FILENAME?thumb=100x300
func generateImageUrl(collection, recordId, fileName string, size ThumnailSize) string {
	if size.Width == 0 || size.Height == 0 {
		return generateFileUrl(collection, recordId, fileName)
	}
	return generateFileUrl(collection, recordId, fileName) + fmt.Sprintf("?thumb=%dx%d", size.Width, size.Height)
}

func generateFileUrl(collection, recordId, fileName string) string {
	val := fmt.Sprintf("/api/files/%s/%s/%s", collection, recordId, fileName)
	fmt.Println("File URL: ", val)
	return val
}

func createZip(blobs []*blob.Reader, logger *log.Logger) (*bytes.Buffer, error) {
	buf := new(bytes.Buffer)
	zipWriter := zip.NewWriter(buf)

	// Iterate over the blobs, create a new entry for each one.
	for i, br := range blobs {
		// Use a generic file name; adjust as needed if you have actual filenames.
		fileName := fmt.Sprintf("file%d", i)
		entryWriter, err := zipWriter.Create(fileName)
		if err != nil {
			return nil, fmt.Errorf("error creating zip entry for %s: %w", fileName, err)
		}
		if br == nil {
			logger.Printf("Blob reader is nil for file %s", fileName)
			continue
		}
		// Copy the blob's content into the zip entry.
		if _, err := io.Copy(entryWriter, br); err != nil {
			return nil, fmt.Errorf("error copying data to zip entry for %s: %w", fileName, err)
		}
	}

	// Finalize the zip archive.
	if err := zipWriter.Close(); err != nil {
		return nil, fmt.Errorf("error closing zip writer: %w", err)
	}

	return buf, nil
}
