package lib

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"log"
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

func createZip(files []FileInfo, logger *log.Logger) (*bytes.Buffer, error) {
	buf := new(bytes.Buffer)
	zipWriter := zip.NewWriter(buf)
	defer zipWriter.Close()

	for _, file := range files {
		// Create a new file in the zip with the original filename
		zipFile, err := zipWriter.Create(file.Filename)
		if err != nil {
			logger.Printf("Error creating zip entry for %s: %v", file.Filename, err)
			continue
		}
		if file.Reader == nil {
			logger.Printf("Blob reader is nil for file %s", file.Filename)
			continue
		}
		// Copy the file content to the zip
		_, err = io.Copy(zipFile, file.Reader)
		if err != nil {
			logger.Printf("Error copying content for %s: %v", file.Filename, err)
		}
	}

	return buf, nil
}
