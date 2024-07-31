# Start with a base image that has Go installed
FROM golang:latest as go-builder

# Set the working directory inside the container
WORKDIR /app

# Copy the Go modules manifests
COPY go.mod go.sum ./

# Download and cache dependencies
RUN go mod download

# Copy the rest of the application source code
COPY . .

# Build the application
RUN make build

# Start a new stage to create a lightweight final image
FROM alpine:latest

# Set the working directory to /bin inside the container
WORKDIR /bin

# --- Runtime stage ---
FROM ubuntu:latest AS runtime

# Install OpenSSH server and nginx
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssh-server nginx \
    && echo "root:Docker!" | chpasswd

# Create nginx log directories
RUN mkdir -p /var/log/nginx /usr/share/nginx/logs \
    && touch /usr/share/nginx/logs/nginx_error.log \
    && touch /usr/share/nginx/logs/nginx_access.log \
    && chmod -R 755 /usr/share/nginx/logs /var/log/nginx

COPY sshd_config /etc/ssh/
COPY entry.sh ./
RUN chmod +x /entry.sh

EXPOSE 8090 2222

# Copy the Go binary from the go-builder stage
COPY --from=go-builder /app/bin/pantrify /usr/local/bin/pantrify
# Ensure backend binary is executable
RUN chmod +x /usr/local/bin/pantrify
RUN ldd /usr/local/bin/pantrify || true

# On azure this folder is mounted from a fileshare
WORKDIR /data

CMD ["/bin/sh", "-c", "./../entry.sh && pantrify serve --http=0.0.0.0:8090"]
