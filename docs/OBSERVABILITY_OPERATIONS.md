# Observability Operations & Security

## Security

### Production Deployment

**DO NOT expose SigNoz UI (port 3301) directly to the internet.**

**Recommended Access:**
- SSH tunnel: `ssh -L 3301:localhost:3301 user@server`
- VPN connection
- Reverse proxy with authentication (nginx + basic auth/OAuth)

**Current Configuration:**
- ✅ OTLP ports (4317, 4318) bound to `127.0.0.1` (localhost only)
- ✅ ClickHouse ports NOT exposed
- ⚠️ UI port exposed - add authentication in production

**Quick Fix:** Remove UI port from `docker-compose.yml` or add nginx reverse proxy with auth.

## Maintenance

### Health Checks

```bash
docker compose ps signoz clickhouse
docker compose logs signoz --tail 50
curl http://localhost:3301/api/health
```

### Data Retention

**Defaults:** Traces 7 days, Metrics 90 days, Logs 7 days

**Configure:** SigNoz UI → Settings → Data Retention

**Storage:** ~6 GB/day for 1M operations/day

### Backup

```bash
# Backup ClickHouse volume
docker run --rm -v dukarun_clickhouse_data:/data -v $(pwd)/backups:/backup \
  alpine tar czf /backup/clickhouse-$(date +%Y%m%d).tar.gz /data
```

## Performance Tuning

**Resources:** SigNoz (2 CPU, 4 GB RAM), ClickHouse (4 CPU, 8 GB RAM)

**High Volume (10M+ ops/day):**
- Enable sampling (10-20%)
- Increase ClickHouse resources (8+ CPU, 16+ GB RAM)
- Consider ClickHouse cluster

**Sampling Example:**
```typescript
// In telemetry.init.ts
import { TraceIdRatioBased } from '@opentelemetry/sdk-trace-base';

const sdk = new NodeSDK({
    sampler: new TraceIdRatioBased(0.1), // 10% sampling
    // ... other config
});
```

## Troubleshooting

**High Memory Usage:** Increase limits, reduce retention, enable sampling

**Slow Queries:** Add time filters, limit results, increase ClickHouse resources

**Storage Full:** Reduce retention, clean old data, increase storage

**Connection Issues:** Check network, verify endpoints, review Docker network config

## Additional Resources

- [SigNoz Docs](https://signoz.io/docs/)
- [Main Observability Guide](./OBSERVABILITY.md)
