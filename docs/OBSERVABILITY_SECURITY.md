# SigNoz Security Considerations

## Overview

SigNoz and ClickHouse contain sensitive observability data and should **NOT** be exposed directly to the internet without proper security measures.

## Security Risks

### SigNoz UI (Port 3301)
- **Risk**: Contains traces, logs, and metrics that may include sensitive data
- **Risk**: No authentication by default
- **Risk**: Exposes system architecture and internal operations

### ClickHouse (Ports 8123, 9000)
- **Risk**: Direct database access
- **Risk**: Can expose all telemetry data
- **Risk**: No authentication by default

### OTLP Endpoints (Ports 4317, 4318)
- **Risk**: Can receive telemetry data from unauthorized sources
- **Risk**: Potential for data injection or DoS attacks

## Recommended Security Measures

### 1. Network Isolation

**Current Configuration:**
- OTLP ports (4317, 4318) are bound to `127.0.0.1` (localhost only)
- Services access SigNoz via Docker service name `signoz:4318` (internal network)
- ClickHouse ports are NOT exposed to host

**For Production:**
- Remove UI port exposure entirely, or
- Use Docker networks to isolate observability services
- Use VPN or SSH tunnel for access

### 2. Reverse Proxy with Authentication

**Recommended Setup:**
```nginx
# nginx reverse proxy with basic auth
location /signoz/ {
    auth_basic "SigNoz Access";
    auth_basic_user_file /etc/nginx/.htpasswd;
    
    proxy_pass http://signoz:3301/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

**Alternative:**
- Use OAuth2/OIDC proxy (e.g., oauth2-proxy)
- Use cloud provider authentication (AWS ALB, GCP IAP)
- Use VPN access only

### 3. Access Control

**Best Practices:**
- Limit access to authorized personnel only
- Use strong passwords or OAuth
- Enable audit logging for access
- Rotate credentials regularly
- Use IP whitelisting if possible

### 4. Data Protection

**Considerations:**
- Telemetry data may contain PII (user IDs, IPs, etc.)
- Implement data retention policies
- Consider data masking for sensitive fields
- Encrypt data at rest (ClickHouse volumes)
- Use TLS for all connections

### 5. Production Deployment Recommendations

**Option 1: Internal Network Only (Recommended)**
```yaml
# docker-compose.yml
signoz:
  ports:
    # Remove UI port entirely
    # - "3301:3301"  # REMOVED
  networks:
    - internal  # Isolated network
```

Access via:
- SSH tunnel: `ssh -L 3301:localhost:3301 user@server`
- VPN connection
- Internal network only

**Option 2: Authenticated Reverse Proxy**
```yaml
# Expose via nginx with auth
nginx:
  ports:
    - "443:443"  # HTTPS with auth
  # Proxy to signoz:3301 (internal)
```

**Option 3: Cloud Provider Managed**
- Use managed observability services (Datadog, New Relic, etc.)
- Use cloud provider authentication
- Leverage IAM roles and policies

## Current Configuration Status

### Development
- ✅ UI accessible on localhost:3301 (development only)
- ✅ OTLP ports restricted to localhost
- ✅ ClickHouse not exposed

### Production (Recommended Changes)
- ⚠️ Remove UI port exposure or add authentication
- ✅ OTLP ports already restricted to localhost
- ✅ ClickHouse already not exposed
- ⚠️ Add reverse proxy with authentication

## Quick Security Checklist

- [ ] Remove UI port exposure in production
- [ ] Add reverse proxy with authentication
- [ ] Use strong passwords or OAuth
- [ ] Enable TLS/HTTPS
- [ ] Restrict network access (firewall rules)
- [ ] Enable audit logging
- [ ] Set up data retention policies
- [ ] Review telemetry data for PII
- [ ] Use VPN or SSH tunnel for access
- [ ] Regularly update SigNoz and ClickHouse

## Emergency: If Exposed

If SigNoz UI is accidentally exposed:

1. **Immediately** restrict access (firewall, remove port mapping)
2. Review access logs for unauthorized access
3. Rotate any exposed credentials
4. Review telemetry data for sensitive information
5. Consider data retention/cleanup if compromised

## Additional Resources

- [SigNoz Security Best Practices](https://signoz.io/docs/operate/security/)
- [ClickHouse Security Guide](https://clickhouse.com/docs/en/guides/sre/security/)
- [Docker Network Security](https://docs.docker.com/network/network-tutorial-standalone/)

