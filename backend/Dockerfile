# ========================================
# Backend Production Dockerfile
# ========================================

FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies including devDependencies for build
RUN npm ci --quiet --no-audit --no-fund

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Stage 2: Production runtime
FROM node:22-alpine

# Install wget for health checks and dumb-init for proper signal handling
RUN apk add --no-cache wget dumb-init

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --quiet --no-audit --no-fund --omit=dev && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy static assets and templates
COPY static ./static

# Copy and setup entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create non-root user for security
RUN addgroup -g 1001 -S vendure && \
    adduser -u 1001 -S vendure -G vendure && \
    chown -R vendure:vendure /usr/src/app

USER vendure

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000

# Use dumb-init for proper signal handling and process reaping
ENTRYPOINT ["dumb-init", "--"]
CMD ["docker-entrypoint.sh"]
