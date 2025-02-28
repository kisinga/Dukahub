# syntax=docker/dockerfile:1.4

# Build stage for Go application
FROM golang:alpine AS builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache make git

# Copy and download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Install templ
RUN go install github.com/a-h/templ/cmd/templ@latest

# Copy the rest of the application
COPY . .

# Build the application
RUN make build

# Runtime stage
FROM alpine:latest
WORKDIR /app

# Install necessary packages for SSL and SSH
RUN apk add --no-cache ca-certificates openssh-server

# Set up SSH for Azure integration
RUN ssh-keygen -A
RUN echo "root:Docker!" | chpasswd

# Copy our entry script
COPY docker-entry.sh /docker-entry.sh
RUN chmod +x /docker-entry.sh

# Copy the binary from the builder stage
COPY --from=builder /app/backend /app/backend

# Set up data volume
VOLUME /data


# Expose ports
EXPOSE 80 2222

# Command to run
CMD ["/docker-entry.sh"]
