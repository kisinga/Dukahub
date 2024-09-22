# Builder stage for Go
FROM golang:1.22.3-alpine AS go-builder
# Set working directory
WORKDIR /app
# Install build dependencies
RUN apk add --no-cache git
# Copy Go module manifests, vendor directory, and application source
COPY go.mod go.sum ./
COPY vendor ./vendor
COPY . .
# Build the application using vendored dependencies
RUN CGO_ENABLED=0 GOOS=linux go build -mod=vendor -ldflags="-w -s" -o pantrify

# Build stage for frontend
FROM node:18-alpine AS node-builder
# Set the working directory
WORKDIR /app
# Copy package.json and package-lock.json (if available)
COPY ./frontend/package*.json ./
# Install dependencies
RUN npm ci
# Copy the rest of the frontend code
COPY ./frontend .
# Build the frontend
RUN npm run build

# Runtime stage
FROM alpine:3.18
# Set environment variables
ENV PUBLIC_FOLDER_PATH="/public"
# Install necessary packages
RUN apk add --no-cache openssh-server
# Set up SSH
RUN ssh-keygen -A
COPY docker_configs/sshd_config /etc/ssh/
COPY docker_configs/entry.sh ./
RUN chmod +x /entry.sh
# Copy the Go binary from the builder stage
COPY --from=go-builder /app/pantrify /usr/local/bin/pantrify
# Copy the frontend build from the node-builder stage
COPY --from=node-builder /app/dist /public
# Create a non-root user
RUN adduser -D appuser
# Set up the data volume
VOLUME /data
WORKDIR /data
# Change ownership of the necessary directories
RUN chown -R appuser:appuser /data /public /usr/local/bin/pantrify /entry.sh
# Switch to non-root user
USER appuser
# Expose necessary ports
EXPOSE 80 2222
# Command to run
CMD ["/bin/sh", "-c", "../entry.sh && pantrify serve --http=0.0.0.0:80"]
