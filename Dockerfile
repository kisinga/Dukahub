# Builder stage for Go
FROM golang:1.23.4-alpine AS go-builder
WORKDIR /app
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o pantrify

# Build stage for frontend
FROM node:18-alpine AS node-builder
WORKDIR /app
COPY ./frontend/package*.json ./
RUN npm ci
COPY ./frontend .
RUN npm run build

# Runtime stage
FROM alpine:3.18
ENV PUBLIC_FOLDER_PATH="/public"

# Install necessary packages
RUN apk add --no-cache openssh-server

# Set up SSH
RUN ssh-keygen -A
COPY docker_configs/sshd_config /etc/ssh/sshd_config
RUN echo "root:Docker!" | chpasswd

# Copy and set up entry script
COPY docker_configs/entry.sh /entry.sh
RUN chmod +x /entry.sh

# Copy the Go binary from the builder stage
COPY --from=go-builder /app/pantrify /usr/local/bin/pantrify

# Copy the frontend build from the node-builder stage
COPY --from=node-builder /app/dist /public

# Set up the data volume
VOLUME /data
WORKDIR /data

# Expose necessary ports
EXPOSE 80 2222

# Command to run
CMD ["/entry.sh"]
