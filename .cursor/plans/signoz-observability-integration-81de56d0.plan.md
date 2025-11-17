<!-- 81de56d0-9381-45a8-9c5b-8b1d22adabc2 07c78997-759f-45b5-be37-8b2859cfa736 -->
# SigNoz Observability Integration Plan

## Overview

Integrate SigNoz as a unified observability platform providing traces, metrics, and logs for the Dukahub application. This implementation will cover both backend (NestJS/Vendure server and worker) and frontend (Angular) with proper instrumentation, configuration, and documentation.

## Architecture

### Components

- **SigNoz Backend**: Self-hosted in Docker Compose
- **OpenTelemetry SDK**: Backend instrumentation (NestJS)
- **OpenTelemetry Web**: Frontend instrumentation (Angular)
- **OTLP Exporters**: Send telemetry data to SigNoz
- **Automatic Instrumentation**: HTTP, GraphQL, TypeORM, Redis
- **Manual Instrumentation**: Key business operations (orders, payments, ML, ledger)

### Data Flow

```
Frontend (Angular) → OTLP HTTP → SigNoz
Backend Server → OTLP gRPC → SigNoz
Backend Worker → OTLP gRPC → SigNoz
```

## Implementation Tasks

### Phase 1: Infrastructure Setup

#### 1.1 Add SigNoz to Docker Compose

- **File**: `docker-compose.yml`
- **Action**: Add SigNoz service with required ports and volumes
- **Details**:
  - Port 3301: UI
  - Port 4317: OTLP gRPC
  - Port 4318: OTLP HTTP
  - Persistent volume for data
  - Health checks

#### 1.2 Environment Configuration

- **File**: `backend/src/infrastructure/config/environment.config.ts`
- **Action**: Add SigNoz configuration section
- **Variables**:
  - `SIGNOZ_ENABLED`: Feature flag
  - `SIGNOZ_ENDPOINT`: OTLP endpoint URL
  - `SIGNOZ_SERVICE_NAME`: Service identifier
  - `SIGNOZ_SERVICE_VERSION`: Version tracking

#### 1.3 Frontend Environment

- **File**: `frontend/src/environments/environment.ts` and `environment.prod.ts`
- **Action**: Add SigNoz configuration
- **Variables**:
  - `enableTracing`: Feature flag
  - `signozEndpoint`: OTLP HTTP endpoint

### Phase 2: Backend Integration

#### 2.1 Install Dependencies

- **File**: `backend/package.json`
- **Action**: Add OpenTelemetry packages
- **Packages**:
  - `@opentelemetry/api`
  - `@opentelemetry/sdk-node`
  - `@opentelemetry/exporter-otlp-grpc`
  - `@opentelemetry/instrumentation`
  - `@opentelemetry/instrumentation-http`
  - `@opentelemetry/instrumentation-express`
  - `@opentelemetry/instrumentation-pg`
  - `@opentelemetry/instrumentation-ioredis`
  - `@opentelemetry/instrumentation-graphql`
  - `@opentelemetry/resources`
  - `@opentelemetry/semantic-conventions`

#### 2.2 Create OpenTelemetry Initialization Module

- **File**: `backend/src/infrastructure/observability/telemetry.init.ts`
- **Action**: Create initialization script that runs before app bootstrap
- **Features**:
  - Initialize OpenTelemetry SDK
  - Configure OTLP exporters (gRPC for backend)
  - Set up automatic instrumentations
  - Configure resource attributes (service name, version, environment)
  - Handle graceful shutdown

#### 2.3 Create Observability Module

- **File**: `backend/src/infrastructure/observability/observability.module.ts`
- **Action**: NestJS module for observability services
- **Exports**:
  - TracingService (manual span creation)
  - MetricsService (custom metrics)
  - LoggingService (structured logging with trace correlation)

#### 2.4 Create Tracing Service

- **File**: `backend/src/infrastructure/observability/tracing.service.ts`
- **Action**: Service for manual span creation
- **Methods**:
  - `startSpan(name, attributes)`: Start custom span
  - `endSpan(span, success, error)`: End span with status
  - `addEvent(span, name, attributes)`: Add events to spans
  - `setAttributes(span, attributes)`: Add attributes to spans

#### 2.5 Create Metrics Service

- **File**: `backend/src/infrastructure/observability/metrics.service.ts`
- **Action**: Service for custom metrics
- **Metrics**:
  - Business metrics (orders created, payments processed)
  - Performance metrics (request duration, error rate)
  - Resource metrics (DB connection pool, Redis usage)

#### 2.6 Integrate with Application Bootstrap

- **File**: `backend/src/index.ts`
- **Action**: Initialize OpenTelemetry before Vendure bootstrap
- **File**: `backend/src/index-worker.ts`
- **Action**: Initialize OpenTelemetry for worker process

#### 2.7 Add Manual Instrumentation to Key Services

- **Files**: 
  - `backend/src/services/orders/order-creation.service.ts`
  - `backend/src/services/payments/payment-allocation.service.ts`
  - `backend/src/services/financial/ledger-posting.service.ts`
  - `backend/src/services/ml/ml-extraction-queue.service.ts`
  - `backend/src/services/auth/registration.service.ts`
- **Action**: Add manual spans for critical business operations
- **Pattern**: Start span → add attributes → log events → end span

#### 2.8 Enhance Logging with Trace Context

- **File**: `backend/src/infrastructure/observability/logging.service.ts`
- **Action**: Logger wrapper that includes trace IDs
- **Integration**: Update existing NestJS Logger usage to include trace context

### Phase 3: Frontend Integration

#### 3.1 Install Dependencies

- **File**: `frontend/package.json`
- **Action**: Add OpenTelemetry web packages
- **Packages**:
  - `@opentelemetry/api`
  - `@opentelemetry/sdk-web`
  - `@opentelemetry/exporter-otlp-http`
  - `@opentelemetry/instrumentation-fetch`
  - `@opentelemetry/instrumentation-xml-http-request`
  - `@opentelemetry/context-zone`

#### 3.2 Create Tracing Service

- **File**: `frontend/src/app/core/services/tracing.service.ts`
- **Action**: Angular service for frontend tracing
- **Features**:
  - Initialize OpenTelemetry SDK
  - Configure OTLP HTTP exporter
  - Automatic fetch/HTTP instrumentation
  - Manual span creation for user actions
  - Zone.js integration for Angular

#### 3.3 Update Apollo Service

- **File**: `frontend/src/app/core/services/apollo.service.ts`
- **Action**: Add trace context propagation
- **Changes**:
  - Inject trace context headers into GraphQL requests
  - Propagate trace IDs to backend

#### 3.4 Initialize in App Component

- **File**: `frontend/src/app/app.component.ts` or `app.config.ts`
- **Action**: Initialize tracing service on app startup
- **Condition**: Only in production or when enabled via environment

#### 3.5 Add Manual Instrumentation for Key User Actions

- **Files**: Key component services (order creation, product management)
- **Action**: Add manual spans for important user interactions
- **Pattern**: Start span → execute action → end span with result

### Phase 4: Configuration & Environment

#### 4.1 Docker Compose Configuration

- **File**: `docker-compose.yml`
- **Action**: Complete SigNoz service configuration
- **Includes**: Volumes, networks, health checks, environment variables

#### 4.2 Environment Variables Documentation

- **File**: `docs/INFRASTRUCTURE.md`
- **Action**: Document SigNoz environment variables
- **File**: `backend/README.md`
- **Action**: Add SigNoz configuration section

#### 4.3 Development vs Production Configuration

- **Action**: Ensure SigNoz can be disabled in development
- **Action**: Production-ready defaults with feature flags

### Phase 5: Documentation

#### 5.1 Main Observability Documentation

- **File**: `docs/OBSERVABILITY.md`
- **Sections**:
  - Overview and architecture
  - SigNoz setup and access
  - Understanding traces, metrics, and logs
  - Querying and filtering
  - Alerting configuration
  - Troubleshooting guide

#### 5.2 Backend Instrumentation Guide

- **File**: `docs/OBSERVABILITY_BACKEND.md`
- **Sections**:
  - Automatic instrumentation
  - Manual span creation
  - Custom metrics
  - Log correlation
  - Best practices

#### 5.3 Frontend Instrumentation Guide

- **File**: `docs/OBSERVABILITY_FRONTEND.md`
- **Sections**:
  - Frontend tracing setup
  - User action instrumentation
  - GraphQL request tracing
  - Performance monitoring

#### 5.4 Operational Guide

- **File**: `docs/OBSERVABILITY_OPERATIONS.md`
- **Sections**:
  - SigNoz maintenance
  - Data retention policies
  - Performance tuning
  - Backup and recovery
  - Scaling considerations

#### 5.5 Update Architecture Documentation

- **File**: `ARCHITECTURE.md`
- **Action**: Add observability section
- **Content**: SigNoz integration, data flow, key metrics

### Phase 6: Testing & Validation

#### 6.1 Local Development Testing

- **Action**: Verify traces appear in SigNoz UI
- **Action**: Test manual spans
- **Action**: Verify metrics collection
- **Action**: Test log correlation

#### 6.2 Integration Testing

- **Action**: Test end-to-end request tracing (frontend → backend)
- **Action**: Verify trace context propagation
- **Action**: Test worker process tracing

#### 6.3 Performance Impact Assessment

- **Action**: Measure overhead of instrumentation
- **Action**: Verify no significant performance degradation
- **Action**: Document expected overhead

## Key Files to Create/Modify

### New Files

- `backend/src/infrastructure/observability/telemetry.init.ts`
- `backend/src/infrastructure/observability/observability.module.ts`
- `backend/src/infrastructure/observability/tracing.service.ts`
- `backend/src/infrastructure/observability/metrics.service.ts`
- `backend/src/infrastructure/observability/logging.service.ts`
- `frontend/src/app/core/services/tracing.service.ts`
- `docs/OBSERVABILITY.md`
- `docs/OBSERVABILITY_BACKEND.md`
- `docs/OBSERVABILITY_FRONTEND.md`
- `docs/OBSERVABILITY_OPERATIONS.md`

### Modified Files

- `docker-compose.yml` (add SigNoz service)
- `backend/package.json` (add dependencies)
- `backend/src/infrastructure/config/environment.config.ts` (add SigNoz config)
- `backend/src/index.ts` (initialize telemetry)
- `backend/src/index-worker.ts` (initialize telemetry)
- `frontend/package.json` (add dependencies)
- `frontend/src/environments/environment.ts` (add SigNoz config)
- `frontend/src/app/core/services/apollo.service.ts` (trace propagation)
- `frontend/src/app/app.component.ts` or `app.config.ts` (initialize tracing)
- `ARCHITECTURE.md` (add observability section)
- `docs/INFRASTRUCTURE.md` (add SigNoz section)

## Success Criteria

1. SigNoz UI accessible and functional
2. Backend traces visible in SigNoz (server and worker)
3. Frontend traces visible and correlated with backend
4. Automatic instrumentation working (HTTP, GraphQL, DB, Redis)
5. Manual spans for key business operations
6. Metrics collection functional
7. Log correlation with traces working
8. Documentation complete and accurate
9. No significant performance impact (< 5% overhead)
10. Production-ready configuration

## Implementation Order

1. Infrastructure (Docker Compose, environment config)
2. Backend core (OpenTelemetry init, services)
3. Backend instrumentation (automatic + manual)
4. Frontend core (tracing service, Apollo integration)
5. Frontend instrumentation (user actions)
6. Documentation
7. Testing and validation

## Notes

- Use feature flags to enable/disable observability
- Ensure graceful degradation if SigNoz is unavailable
- Consider sampling for high-volume production environments
- Document expected resource usage (CPU, memory, storage)
- Plan for data retention policies

### To-dos

- [ ] Add SigNoz service to docker-compose.yml with proper ports, volumes, and health checks
- [ ] Add SigNoz configuration to backend environment.config.ts (endpoint, service name, feature flags)
- [ ] Add SigNoz configuration to frontend environment files (endpoint, feature flags)
- [ ] Install OpenTelemetry packages in backend (SDK, exporters, instrumentations)
- [ ] Create telemetry.init.ts to initialize OpenTelemetry SDK before app bootstrap
- [ ] Create observability.module.ts with TracingService, MetricsService, and LoggingService
- [ ] Implement TracingService for manual span creation and management
- [ ] Implement MetricsService for custom business and performance metrics
- [ ] Implement LoggingService wrapper that includes trace IDs in logs
- [ ] Integrate telemetry initialization in index.ts and index-worker.ts before bootstrap
- [ ] Add manual spans to key services (order creation, payments, ledger, ML extraction, registration)
- [ ] Install OpenTelemetry web packages in frontend (SDK, exporters, instrumentations)
- [ ] Create frontend TracingService with OpenTelemetry SDK and OTLP HTTP exporter
- [ ] Update ApolloService to propagate trace context headers in GraphQL requests
- [ ] Initialize tracing service in app.component.ts or app.config.ts on startup
- [ ] Add manual spans for key user actions (order creation, product management)
- [ ] Create docs/OBSERVABILITY.md with overview, setup, querying, and troubleshooting
- [ ] Create docs/OBSERVABILITY_BACKEND.md with instrumentation guide and best practices
- [ ] Create docs/OBSERVABILITY_FRONTEND.md with frontend tracing setup and usage
- [ ] Create docs/OBSERVABILITY_OPERATIONS.md with maintenance, retention, and scaling guide
- [ ] Update ARCHITECTURE.md with observability section and SigNoz integration details
- [ ] Update docs/INFRASTRUCTURE.md with SigNoz environment variables and configuration
- [ ] Test end-to-end tracing, verify trace correlation, measure performance impact