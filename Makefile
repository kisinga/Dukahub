SHELL=/bin/bash
BINARY_NAME=pantrify
BINARY_DIR=./bin

.PHONY: build
build:
	@echo "Building frontend..."
	@make -C ./frontend all
	@echo "Building backend..."
	@mkdir -p $(BINARY_DIR)
	@go build -o $(BINARY_DIR)/$(BINARY_NAME) *.go

.PHONY: test
test:
	@go test ./... -coverprofile=coverage.out
	@coverage=$$(go tool cover -func=coverage.out | grep total | grep -Eo '[0-9]+\.[0-9]+') ;\
	rm coverage.out ;\
	if [ $$(bc <<< "$$coverage < 80.0") -eq 1 ]; then \
		echo "Low test coverage: $$coverage% < 80.0%" ;\
		exit 1 ;\
	fi

.PHONY: test-coverage-report
test-coverage-report:
	@go test -v ./... -covermode=count -coverpkg=./... -coverprofile coverage/coverage.out
	@go tool cover -html coverage/coverage.out -o coverage/coverage.html
	@open coverage/coverage.html

.PHONY: clean
clean:
	@rm -rf $(BINARY_DIR)
	@go clean
