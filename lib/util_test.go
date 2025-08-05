package lib

import (
	"archive/zip"
	"bytes"
	"io"
	"log"
	"testing"
)

type eofCountingReader struct {
	data     []byte
	pos      int
	eofReads int
}

func (r *eofCountingReader) Read(p []byte) (int, error) {
	if r.pos >= len(r.data) {
		r.eofReads++
		return 0, io.EOF
	}
	n := copy(p, r.data[r.pos:])
	r.pos += n
	return n, nil
}

func (r *eofCountingReader) Close() error { return nil }

func TestCreateZipSingleRead(t *testing.T) {
	content := []byte("hello world")
	r := &eofCountingReader{data: content}
	files := []FileInfo{{Reader: r, Filename: "test.txt"}}

	buf, err := createZip(files, log.New(io.Discard, "", 0))
	if err != nil {
		t.Fatalf("createZip returned error: %v", err)
	}
	if r.eofReads != 1 {
		t.Fatalf("expected 1 EOF read, got %d", r.eofReads)
	}
	zr, err := zip.NewReader(bytes.NewReader(buf.Bytes()), int64(buf.Len()))
	if err != nil {
		t.Fatalf("failed to open zip: %v", err)
	}
	if len(zr.File) != 1 {
		t.Fatalf("expected 1 file in zip, got %d", len(zr.File))
	}
	f, err := zr.File[0].Open()
	if err != nil {
		t.Fatalf("open file: %v", err)
	}
	data, err := io.ReadAll(f)
	if err != nil {
		t.Fatalf("read file: %v", err)
	}
	if string(data) != string(content) {
		t.Fatalf("content mismatch: got %q want %q", string(data), string(content))
	}
}
