# syntax=docker/dockerfile:1.4

# Build stage for Go application
FROM golang:alpine AS builder
WORKDIR /app

# Install build dependencies first - these change less frequently
RUN apk add --no-cache make git

# Install templ - this is a build dependency that changes infrequently
RUN go install github.com/a-h/templ/cmd/templ@latest

# Copy only dependency files first
COPY go.mod go.sum ./
RUN go mod download

# Copy only the files needed for building
COPY Makefile ./
COPY lib/ ./lib/
COPY models/ ./models/
COPY resolvers/ ./resolvers/
COPY views/ ./views/
COPY public/ ./public/
COPY main.go ./

# Build the application
RUN make build

# Runtime stage
FROM alpine:latest

# Install necessary packages for SSL and SSH in a single layer
RUN apk add --no-cache ca-certificates openssh-server && \
    # Set up SSH for Azure integration
    ssh-keygen -A && \
    echo "root:Docker!" | chpasswd

# Setup SSH config and entry script
COPY docker-entry.sh /docker-entry.sh
RUN chmod +x /docker-entry.sh

# Copy the binary and public directory from the builder stage
COPY --from=builder /app/backend /usr/local/bin/backend
COPY --from=builder /app/public /public
RUN chmod +x /usr/local/bin/backend

# Mount pb_data from host OS 
VOLUME /pb_data

# Expose ports
EXPOSE 80 2222

# Command to run
CMD ["/docker-entry.sh"]
