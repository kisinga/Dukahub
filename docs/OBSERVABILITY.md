# Observability with SigNoz

## Quick Start

**Access:** `http://localhost:3301` (production) | **Production:** Use SSH tunnel or VPN

**Enable:**

- Backend: `SIGNOZ_ENABLED=true`
- Frontend: `ENABLE_TRACING=true` (or via `window.__APP_CONFIG__`)

### Development Mode Limitation

**⚠️ SigNoz tracing is NOT available in development mode** (`ng serve`)

**Reasons:**

1. **Static Proxy Configuration**: Angular dev server uses `proxy.conf.json` which is a static file that cannot be dynamically configured
2. **No Nginx Proxy**: The `/signoz/` proxy route is only available in production via nginx
3. **Runtime Injection**: Frontend tracing relies on runtime config injection (`window.__APP_CONFIG__`) which only happens in Docker containers

**Workaround:** Use production build (`npm run build`) and serve via Docker Compose for testing observability features.

## Architecture

```
Frontend → OTLP HTTP → Nginx Proxy → SigNoz ← OTLP gRPC ← Backend (Server/Worker)
```

**Components:** SigNoz (Docker), OpenTelemetry SDK (auto-instrumentation), Manual spans (business ops)

**Note:** Frontend tracing requires nginx proxy (production only). Development mode (`ng serve`) does not support SigNoz tracing.

## Automatic Instrumentation

**Backend:** HTTP, GraphQL, PostgreSQL, Redis - **No code changes needed**

**Frontend:** Fetch, XMLHttpRequest, GraphQL - **No code changes needed**

## Manual Instrumentation

### Backend Pattern

```typescript
import { TracingService, MetricsService } from '../../infrastructure/observability/tracing.service';

constructor(
    @Optional() private readonly tracingService?: TracingService,
    @Optional() private readonly metricsService?: MetricsService,
) { }

async createOrder(ctx: RequestContext, input: CreateOrderInput): Promise<Order> {
    const span = this.tracingService?.startSpan('order.create', {
        'order.channel_id': ctx.channelId?.toString() || '',
    });

    try {
        const order = await this.orderService.createDraft(ctx);

        this.metricsService?.recordOrderCreated(
            ctx.channelId?.toString() || '',
            input.paymentMethodCode,
            order.totalWithTax
        );

        this.tracingService?.setAttributes(span!, {
            'order.id': order.id.toString(),
            'order.code': order.code,
        });

        this.tracingService?.endSpan(span!, true);
        return order;
    } catch (error) {
        this.tracingService?.endSpan(span!, false, error instanceof Error ? error : new Error(String(error)));
        throw error;
    }
}
```

### Frontend Pattern

```typescript
import { TracingService } from '@core/services/tracing.service';

constructor(private readonly tracingService = inject(TracingService)) { }

async createOrder(data: CreateOrderInput): Promise<Order> {
    const span = this.tracingService.startSpan('order.create', {
        'order.items_count': data.items.length.toString(),
    });

    try {
        const result = await this.apolloService.mutate(CREATE_ORDER, { variables: { input: data } });
        this.tracingService.setAttributes(span, { 'order.id': result.data.createOrder.id });
        this.tracingService.endSpan(span, true);
        return result.data.createOrder;
    } catch (error) {
        this.tracingService.endSpan(span, false, error instanceof Error ? error : new Error(String(error)));
        throw error;
    }
}
```

## Available Metrics

- `orders_created_total`: Orders created (by channel, payment method)
- `order_value_cents`: Order values (histogram)
- `ledger_postings_total`: Ledger postings (by type, channel)
- `ml_extractions_total`: ML extractions (by channel, status)
- `request_duration_seconds`: Request latency (by route, method, status)

## Log Correlation

**Use LoggingService** (automatically includes trace IDs):

```typescript
import { LoggingService } from '../../infrastructure/observability/logging.service';

private readonly logger = new LoggingService(MyService.name);
// Logs: [MyService] [Trace: abc123] Order created: ORD-123
```

## Querying in SigNoz

**Traces:** Filter by service (`dukarun-backend`, `dukarun-frontend`), operation (`order.create`), attributes (`order.channel_id`), or errors

**Metrics:** Select metric → Add filters → View time series

**Logs:** Search by trace ID, service name, or log level

## Configuration

### Backend Environment

```bash
SIGNOZ_ENABLED=true
SIGNOZ_HOST=signoz
SIGNOZ_OTLP_GRPC_PORT=4317
SIGNOZ_SERVICE_NAME=dukarun-backend
```

### Frontend Environment

```typescript
// environment.ts / environment.prod.ts
export const environment = {
  enableTracing: true,
  signozEndpoint: 'http://signoz:4318/v1/traces', // Docker: use service name
};
```

**Runtime (Docker):** Set `ENABLE_TRACING` and `SIGNOZ_ENDPOINT` env vars (injected via `window.__APP_CONFIG__`)

## Troubleshooting

### Development Mode

**Q: Why don't I see traces when running `ng serve`?**

**A:** SigNoz tracing is not available in development mode. The Angular dev server's `proxy.conf.json` is static and cannot proxy `/signoz/` requests. Additionally, runtime config injection only works in Docker containers.

**Solution:** Use Docker Compose for testing observability:

```bash
docker compose up -d
# Access frontend at http://localhost:4200
```

### Production Mode

**No traces appearing:**

1. Check `SIGNOZ_ENABLED=true` / `enableTracing: true`
2. Verify SigNoz running: `docker compose ps signoz`
3. Check logs for initialization: `[Telemetry] OpenTelemetry SDK initialized`
4. Verify nginx proxy: Check browser network tab for `/signoz/v1/traces` requests

**Traces not correlating (frontend → backend):**

- Verify `propagation.inject()` in ApolloService
- Check network tab for `traceparent` header

**High performance impact:**

- Disable in dev: `SIGNOZ_ENABLED=false`
- Enable sampling for high-volume (future)

## Development vs Production

### Development Mode (`ng serve`)

- ❌ **SigNoz tracing NOT available**
- Reason: Angular dev server uses static `proxy.conf.json` which cannot proxy `/signoz/` requests
- Workaround: Use Docker Compose for testing observability

### Production Mode (Docker)

- ✅ **SigNoz tracing fully available**
- Nginx proxy handles `/signoz/` requests
- Runtime config injection via `window.__APP_CONFIG__`
- All observability features enabled

## Best Practices

**Span naming:** `order.create`, `ledger.postPayment` (dot notation, domain prefix)

**Attributes:** `order.channel_id`, `order.code` (snake_case, consistent prefixes)

**Always end spans:** Even on errors - use try/catch with `endSpan(span, false, error)`

**Metrics:** Record after successful operations, include channel IDs for filtering

## Security

**Production:** Do NOT expose SigNoz UI directly. Use SSH tunnel (`ssh -L 3301:localhost:3301 user@server`) or reverse proxy with auth.

See [OBSERVABILITY_OPERATIONS.md](./OBSERVABILITY_OPERATIONS.md) for security details and operations guide.
