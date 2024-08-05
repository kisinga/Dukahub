# Builder stage for Go and Node.js
FROM golang:latest as builder

# Set working directory
WORKDIR /app

# Install system dependencies including Node.js
RUN apt-get update && \
    apt-get install -y curl build-essential nodejs npm \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for Go
ENV GOPATH /go
ENV PATH $GOPATH/bin:/usr/local/go/bin:$PATH

# Install the templ package
RUN go install github.com/a-h/templ/cmd/templ@latest

# Check Node.js and npm availability
RUN node --version
RUN npm --version

# Copy Go module manifests and install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy application source
COPY . .

# Build the application
RUN make build

# Runtime stage
FROM ubuntu:latest AS runtime

# Install OpenSSH and other necessary packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssh-server \
    && rm -rf /var/lib/apt/lists/*

# Set root password and configure SSH
RUN echo "root:Docker!" | chpasswd
COPY sshd_config /etc/ssh/
COPY entry.sh ./
RUN chmod +x /entry.sh

# Expose necessary ports
EXPOSE 8090 2222

# Copy the Go binary from the builder stage
COPY --from=builder /app/bin/pantrify /usr/local/bin/pantrify
RUN chmod +x /usr/local/bin/pantrify

# Setup work directory
WORKDIR /data

# Command to run
CMD ["/bin/sh", "-c", "./../entry.sh && pantrify serve --http=0.0.0.0:8090"]
