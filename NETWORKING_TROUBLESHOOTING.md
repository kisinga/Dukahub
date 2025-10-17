# Networking Troubleshooting Guide

## Common Issues and Solutions

### 1. Permissions-Policy Header Warnings

**Issue**: Browser console shows warnings about unrecognized Permissions-Policy features.

**Solution**: The nginx configuration now includes all the required features in the Permissions-Policy header to suppress these warnings.

### 2. 503 Service Unavailable Errors

**Issue**: Frontend receives 503 errors when trying to connect to backend.

**Root Causes**:

- Backend service not running
- Network connectivity issues between containers
- Backend service not ready when frontend starts

**Solutions**:

1. **Health Checks**: Added health checks to ensure services are ready
2. **Retry Logic**: Added proxy retry logic for transient failures
3. **Startup Order**: Frontend waits for backend to be healthy
4. **Error Handling**: Better error pages and JSON responses

### 3. Cookie/Session Issues

**Issue**: Authentication state is inconsistent, sometimes works, sometimes doesn't.

**Root Causes**:

- Cookie domain/path mismatches
- Proxy not forwarding cookies correctly
- Session cookies not being set properly

**Solutions**:

1. **Cookie Domain Mapping**: Added `proxy_cookie_domain` to map localhost to host
2. **Cookie Path Mapping**: Added `proxy_cookie_path` for consistent paths
3. **Header Forwarding**: Ensured all cookie headers are properly forwarded

## Configuration Files

### nginx.conf

- Main nginx configuration with improved error handling
- Retry logic for backend connectivity
- Better cookie handling for session consistency
- Comprehensive Permissions-Policy header

### nginx.conf.template

- Template for environment variable substitution
- Used by docker entrypoint for dynamic configuration

### docker-entrypoint.sh

- Enhanced with backend connectivity checks
- Waits for backend to be available before starting nginx
- Better error handling and logging

## Deployment

### Independent Container Deployment

The frontend container is designed to run independently and connect to a backend service via environment variables.

```bash
# Run frontend container independently
docker run -d \
  --name dukahub-frontend \
  -p 4200:4200 \
  -e BACKEND_HOST=your-backend-host \
  -e BACKEND_PORT=3000 \
  dukahub-frontend:latest

# For development with local backend
docker run -d \
  --name dukahub-frontend \
  -p 4200:4200 \
  -e BACKEND_HOST=host.docker.internal \
  -e BACKEND_PORT=3000 \
  dukahub-frontend:latest
```

## Monitoring

### Health Endpoints

- Frontend: `http://localhost:4200/health`
- Backend: `http://localhost:3000/health` (if available)

### Logs

```bash
# View frontend container logs
docker logs dukahub-frontend

# Follow logs in real-time
docker logs -f dukahub-frontend

# View backend logs (if running in container)
docker logs your-backend-container
```

### Network Debugging

```bash
# Check if backend is reachable from frontend container
docker exec dukahub-frontend nc -z ${BACKEND_HOST} ${BACKEND_PORT}

# Test API endpoints
curl -v http://localhost:4200/admin-api
curl -v http://localhost:4200/shop-api

# Test health endpoint
curl -v http://localhost:4200/health
```

## Environment Variables

### Frontend

- `BACKEND_HOST`: Backend service hostname (default: backend)
- `BACKEND_PORT`: Backend service port (default: 3000)

### Backend

- `DB_HOSTNAME`: Database hostname
- `DB_PORT`: Database port
- `DB_NAME`: Database name
- `DB_USERNAME`: Database username
- `DB_PASSWORD`: Database password
- `REDIS_HOST`: Redis hostname
- `REDIS_PORT`: Redis port

## Troubleshooting Steps

1. **Check Container Status**

   ```bash
   docker ps
   docker ps -a  # Include stopped containers
   ```

2. **Check Logs**

   ```bash
   docker logs dukahub-frontend
   docker logs your-backend-container
   ```

3. **Test Connectivity**

   ```bash
   # From frontend container
   docker exec dukahub-frontend nc -z ${BACKEND_HOST} ${BACKEND_PORT}

   # Test from host
   curl -v http://localhost:4200/health
   ```

4. **Check Nginx Configuration**

   ```bash
   docker exec dukahub-frontend nginx -t
   ```

5. **Restart Container**
   ```bash
   docker restart dukahub-frontend
   ```

## Performance Optimizations

1. **Caching**: Static assets are cached aggressively
2. **Compression**: Gzip compression enabled
3. **Rate Limiting**: API endpoints have appropriate rate limits
4. **Connection Pooling**: Proper connection handling for backend

## Security Considerations

1. **Headers**: Security headers are properly configured
2. **Rate Limiting**: Prevents abuse of API endpoints
3. **Error Handling**: Sensitive information is not exposed in error messages
4. **Cookie Security**: Proper cookie handling for session management
