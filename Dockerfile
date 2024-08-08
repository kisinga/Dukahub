# Builder stage for Go and Node.js
FROM golang:latest AS go-builder

# Set working directory
WORKDIR /app

# Install system dependencies including Node.js
RUN apt-get update && \
    apt-get install -y curl build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy Go module manifests and install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy application source
COPY . .

# Build the application
RUN go build -o pantrify 


# Build stage for frontend
FROM node:18-alpine AS node-builder

# Set the working directory
WORKDIR /app

# Copy Node.js files and install dependencies
COPY ./frontend .
RUN npm ci
RUN npm run build

# Runtime stage
FROM ubuntu:latest AS runtime

# copy the /public directory from the node-builder stage
COPY --from=node-builder /app/dist /public

# set environment variables
ENV PUBLIC_FOLDER_PATH="/public"

# Install OpenSSH and other necessary packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssh-server \
    && rm -rf /var/lib/apt/lists/*

# Set root password and configure SSH
RUN echo "root:Docker!" | chpasswd
COPY docker_configs/sshd_config /etc/ssh/
COPY docker_configs/entry.sh ./
RUN chmod +x /entry.sh

# Expose necessary ports
EXPOSE 80 2222

# Copy the Go binary from the builder stage
COPY --from=go-builder /app/pantrify /usr/local/bin/pantrify
RUN chmod +x /usr/local/bin/pantrify

# Setup work directory
WORKDIR /data

# Command to run
CMD ["/bin/sh", "-c", "./../entry.sh && pantrify serve --http=0.0.0.0:80"]
