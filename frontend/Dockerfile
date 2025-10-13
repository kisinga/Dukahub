# ========================================
# Frontend Production Dockerfile
# ========================================

# Stage 1: Build Angular application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies with clean install (faster, deterministic)
RUN npm ci --quiet --no-audit --no-fund

# Copy source code
COPY . .

# Build for production with optimizations
RUN npm run build -- --configuration production

# Stage 2: Production nginx server
FROM nginx:1.27-alpine

# Install wget for health checks
RUN apk add --no-cache wget

# Remove default nginx config and content
RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

# Copy built app from builder
COPY --from=builder /app/dist/dukahub-frontend/browser /usr/share/nginx/html

# Copy production nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create cache directories for nginx
RUN mkdir -p /var/cache/nginx/proxy && \
    chown -R nginx:nginx /var/cache/nginx && \
    chmod -R 755 /var/cache/nginx

# Run as non-root user
USER nginx

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4200/health || exit 1

EXPOSE 4200

# Use exec form for proper signal handling
CMD ["nginx", "-g", "daemon off;"]
