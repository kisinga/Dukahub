package lib

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"log"
	"sync"
)

type ThumnailSize struct {
	Width  int
	Height int
}

// replace the existing logos with valid urls
// use this format http://127.0.0.1:8090/api/files/COLLECTION_ID_OR_NAME/RECORD_ID/FILENAME?thumb=100x300
func generateImageUrl(collection, recordId, fileName string, size ThumnailSize) string {
	if fileName == "" {
		return ""
	}
	if size.Width == 0 || size.Height == 0 {
		return generateFileUrl(collection, recordId, fileName)
	}
	return generateFileUrl(collection, recordId, fileName) + fmt.Sprintf("?thumb=%dx%d", size.Width, size.Height)
}

func generateFileUrl(collection, recordId, fileName string) string {
	if fileName == "" {
		return ""
	}
	val := fmt.Sprintf("/api/files/%s/%s/%s", collection, recordId, fileName)
	fmt.Println("File URL: ", val)
	return val
}

// Buffer pool to reuse buffers during io.CopyBuffer.
var bufPool = sync.Pool{
	New: func() interface{} {
		// Allocate an 32KB buffer (tune as needed)
		return make([]byte, 32*1024)
	},
}

func createZip(files []FileInfo, logger *log.Logger) (*bytes.Buffer, error) {
	buf := new(bytes.Buffer)
	zipWriter := zip.NewWriter(buf)
	defer zipWriter.Close()

	for _, file := range files {
		header := &zip.FileHeader{
			Name:   file.Filename,
			Method: zip.Store, // Change to zip.Deflate for compression.
		}
		// Create a new file in the zip with the original filename
		zipFile, err := zipWriter.CreateHeader(header)
		if err != nil {
			logger.Printf("Error creating zip entry for %s: %v", file.Filename, err)
			continue
		}
		if file.Reader == nil {
			logger.Printf("Blob reader is nil for file %s", file.Filename)
			continue
		}
		// Use a preallocated buffer from our pool.
		copyBuf := bufPool.Get().([]byte)
		_, err = io.CopyBuffer(zipFile, file.Reader, copyBuf)
		bufPool.Put(copyBuf) // return the buffer
		if err != nil {
			logger.Printf("Error copying content for %s: %v", file.Filename, err)
		}
	}

	return buf, nil
}
