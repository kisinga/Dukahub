# syntax=docker/dockerfile:1.4
FROM golang:latest AS builder
WORKDIR /app

# Copy the application source code and Makefile
COPY . ./

# Download dependencies (if go.mod and go.sum exist)
RUN if [ -f go.mod ] && [ -f go.sum ]; then go mod download; fi

# Install templ (if needed)
RUN go install github.com/a-h/templ/cmd/templ@latest

# Build the application using the Makefile
RUN make build

CMD ["/backend", "serve", "--http=0.0.0.0:8080"]