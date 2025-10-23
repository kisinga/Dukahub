# ========================================
# Backend Production Dockerfile
# ========================================

FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Set NODE_ENV for build (ensures dev dependencies are available)
ENV NODE_ENV=development

# Copy dependency manifests first for better caching
COPY package*.json ./

# Install all dependencies including devDependencies for build
RUN npm ci --quiet --no-audit --no-fund --include=dev

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Verify build output
RUN echo "Build verification:" && \
    ls -la dist/ && \
    if [ ! -f "dist/index.js" ]; then echo "❌ dist/index.js not found!"; exit 1; fi && \
    if [ ! -f "dist/index-worker.js" ]; then echo "❌ dist/index-worker.js not found!"; exit 1; fi && \
    echo "✅ Build verification successful"

# Stage 2: Production runtime
FROM node:22-alpine

# Install wget for health checks and dumb-init for proper signal handling
RUN apk add --no-cache wget dumb-init

# Set working directory
WORKDIR /usr/src/app

# Set NODE_ENV for production
ENV NODE_ENV=production

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

# Verify copied files exist
RUN echo "Verifying production files:" && \
    ls -la dist/ && \
    if [ ! -f "dist/index.js" ]; then echo "❌ dist/index.js not found in production stage!"; exit 1; fi && \
    if [ ! -f "dist/index-worker.js" ]; then echo "❌ dist/index-worker.js not found in production stage!"; exit 1; fi && \
    echo "✅ Production stage verification successful"

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
