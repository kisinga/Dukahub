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

# Debug: List the build output to see what was created
RUN ls -la /app/dist/

# Stage 2: Production nginx server
FROM nginx:1.27-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Remove default nginx config and content
RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

# Copy build output from builder (Angular 18 default path is dist/dukahub/browser)
COPY --from=builder /app/dist/dukahub/browser /usr/share/nginx/html

# Fallback: older CLI versions may emit dist/dukahub-frontend instead
RUN if [ ! -f /usr/share/nginx/html/index.html ] && [ -d /app/dist/dukahub-frontend ]; then \
      echo "Primary dist path missing, copying from dist/dukahub-frontend fallback..."; \
      rm -rf /usr/share/nginx/html/*; \
      cp -r /app/dist/dukahub-frontend/browser/* /usr/share/nginx/html/; \
    fi

# Copy nginx configuration as template (will be processed at runtime)
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Copy and make entrypoint executable
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create cache directories for nginx
RUN mkdir -p /var/cache/nginx/proxy && \
    chown -R nginx:nginx /var/cache/nginx && \
    chmod -R 755 /var/cache/nginx

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:4200/health || exit 1

EXPOSE 4200

# Entrypoint will substitute env vars and start nginx
ENTRYPOINT ["/docker-entrypoint.sh"]