# Dukahub Architecture

> **Complete system design for V2 (Angular + Vendure)**

## Table of Contents

- [Overview](#overview)
- [Core Problem](#core-problem)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Multi-tenancy Model](#multi-tenancy-model)
- [Data Flow](#data-flow)
- [ML Integration](#ml-integration)
- [Security](#security)

## Overview

Dukahub V2 is a **headless, API-first** point-of-sale system built on modern, scalable technologies. The system uses **Vendure** (a TypeScript e-commerce framework) as the backend and **Angular** for the frontend.

### Design Principles

- **API-First**: Backend is a headless service, decoupled from frontend
- **Modular**: Business logic in plugins, never modify framework code
- **Scalable**: Support growing tenants and transactions
- **Type-Safe**: TypeScript everywhere for robust, maintainable code

## Core Problem

**Small retail businesses struggle with inefficient sales and inventory recording.**

Our solution: An incredibly fast, intuitive POS system augmented with AI that makes recording sales and managing inventory effortless—no barcode scanners, no manual entry.

## Technology Stack

### Backend

| Component     | Technology       | Purpose                       |
| ------------- | ---------------- | ----------------------------- |
| **Framework** | Vendure (NestJS) | Headless commerce platform    |
| **Language**  | TypeScript       | Type-safe development         |
| **Database**  | PostgreSQL 16    | Relational data storage       |
| **Cache**     | Redis 7          | Session & performance caching |
| **API**       | GraphQL          | Efficient data fetching       |

### Frontend

| Component            | Technology         | Purpose                     |
| -------------------- | ------------------ | --------------------------- |
| **Framework**        | Angular 19         | SPA framework               |
| **UI Library**       | daisyUI + Tailwind | Component library & styling |
| **State Management** | RxJS + Signals     | Reactive state handling     |
| **API Client**       | Apollo GraphQL     | Type-safe API communication |

### ML & AI

| Component        | Technology      | Purpose               |
| ---------------- | --------------- | --------------------- |
| **Model Format** | TensorFlow.js   | Client-side inference |
| **Training**     | Python (future) | Model generation      |
| **Storage**      | Static files    | Public model hosting  |

## System Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Angular SPA (Port 4200)                   │  │
│  │  • POS Interface  • Product Management            │  │
│  │  • ML Model Loading  • Offline Support            │  │
│  └──────────────────┬───────────────────────────────┘  │
└────────────────────┼────────────────────────────────────┘
                     │ GraphQL API
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Backend Services (Docker)                   │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │      Vendure Server (Port 3000)                 │    │
│  │  • GraphQL API  • Authentication                │    │
│  │  • Product Catalog  • Order Processing          │    │
│  └────────────────┬───────────────────────────────┘    │
│                   │                                      │
│  ┌────────────────┴───────────────────────────────┐    │
│  │      Vendure Worker (Background)                │    │
│  │  • ML Model Training  • Email Notifications     │    │
│  │  • Data Export  • Scheduled Tasks               │    │
│  └────────────────┬───────────────────────────────┘    │
│                   │                                      │
├───────────────────┼──────────────────────────────────┤
│                   ▼                                      │
│  ┌─────────────────────────┐   ┌──────────────────┐   │
│  │  PostgreSQL (Port 5433)  │   │  Redis (Port 6479)│   │
│  │  • Persistent Data       │   │  • Cache & Session│   │
│  └─────────────────────────┘   └──────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Port Mapping

| Service    | Internal Port | Exposed Port | Purpose            |
| ---------- | ------------- | ------------ | ------------------ |
| Frontend   | 4200          | 4200         | Angular dev server |
| Backend    | 3000          | 3000         | Vendure API        |
| PostgreSQL | 5432          | 5433         | Database           |
| Redis      | 6379          | 6479         | Cache              |

## Multi-tenancy Model

Dukahub uses **Vendure Channels** for multi-tenancy, where each business is a separate channel.

### Tenancy Structure

```
SuperAdmin (Global)
│
├── Channel: Shop A (Business 1)
│   ├── Stock Location: Main Store
│   ├── Users: Manager, Cashier
│   └── Products: Catalog A
│
├── Channel: Shop B (Business 2)
│   ├── Stock Location: Downtown
│   ├── Users: Owner, Staff
│   └── Products: Catalog B
│
└── Channel: Shop C (Business 3)
    ├── Stock Location: Location 1, Location 2
    ├── Users: Multi-location Manager
    └── Products: Catalog C
```

### Key Concepts

- **Channel** = One business/customer company
- **Stock Location** = Physical store or warehouse
- **User Roles** = Scoped to specific channels
- **Products** = Can be shared or channel-specific

### Channel Provisioning

When creating a new business, manually provision:

1. ✅ Stock Location (required for inventory)
2. ✅ Payment Method (required for sales)
3. ✅ Roles (required for user access)
4. ✅ Assign Users (link users to roles)

**See [GAPS.md](./GAPS.md) for known limitations**

## Data Flow

### Sales Transaction Flow

```
1. Camera Scan
   ↓
2. ML Model Inference (client-side)
   ↓
3. Product ID Retrieved
   ↓
4. GraphQL Query (product details)
   ↓
5. Add to Cart (local state)
   ↓
6. Checkout
   ↓
7. Create Order (GraphQL Mutation)
   ↓
8. Update Inventory (automatic)
   ↓
9. Receipt Generation
```

### ML Model Flow

```
1. Admin uploads product photos
   ↓
2. Photos stored in Vendure assets
   ↓
3. Worker job: Train ML model
   ↓
4. Model files saved to static directory
   ↓
5. metadata.json updated with model info
   ↓
6. Frontend fetches model URLs
   ↓
7. Model cached in IndexedDB
   ↓
8. Real-time inference during sales
```

## ML Integration

### Model Storage

```
backend/static/assets/ml-models/
├── {channelId}/
│   ├── latest/
│   │   ├── model.json       # TensorFlow.js architecture (~50 KB)
│   │   ├── weights.bin      # Model weights (2-5 MB)
│   │   └── metadata.json    # Training info & labels (~1 KB)
│   └── temp/                # Atomic write staging
```

### Public URLs

Models served via Vendure's AssetServerPlugin:

```
https://domain.com/assets/ml-models/{channelId}/latest/model.json
https://domain.com/assets/ml-models/{channelId}/latest/weights.bin
https://domain.com/assets/ml-models/{channelId}/latest/metadata.json
```

### Security Model

- **Public model files are safe** - Only contain product IDs
- **Sensitive data (prices, costs) fetched separately** via authenticated API
- **Model versioning** for rollback capability
- **Client-side caching** in IndexedDB for offline use

**See [ML_GUIDE.md](./ML_GUIDE.md) for complete implementation details**

## Security

### Authentication & Authorization

- **JWT Tokens**: Stateless authentication
- **Role-based Access**: Channel-scoped permissions
- **Password Hashing**: bcrypt with appropriate cost
- **Session Management**: Redis-backed sessions

### API Security

- **GraphQL**: Type-safe, introspection disabled in production
- **Rate Limiting**: Prevent abuse and DoS
- **CORS**: Configured for allowed origins
- **Input Validation**: All inputs sanitized and validated

### Data Protection

- **Encryption at Rest**: PostgreSQL encryption
- **Encryption in Transit**: HTTPS/TLS everywhere
- **Secrets Management**: Environment variables, never in code
- **Audit Logging**: Track sensitive operations

## Deployment

Dukahub uses platform-agnostic container images for flexible deployment.

### Key Principles

- **Independent Services**: Frontend, backend, database, and cache run independently
- **Environment-Based Config**: All configuration via environment variables
- **Docker Containers**: Self-contained images with all dependencies
- **Manual Local Dev**: Run services directly on host for fast iteration

**See [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) for complete deployment guide and environment variables**

## Migration from V1

### V1 (PocketBase)

- **Backend**: Go + SQLite
- **Frontend**: Alpine.js + Vanilla JS
- **Auth**: Cookie-based
- **DB**: SQLite (single file)

### V2 (Vendure)

- **Backend**: TypeScript + PostgreSQL
- **Frontend**: Angular + RxJS
- **Auth**: JWT tokens
- **DB**: PostgreSQL (scalable)

**Complete migration documentation: [docs/v1-migration/MIGRATION_SUMMARY.md](./docs/v1-migration/MIGRATION_SUMMARY.md)**

## Performance Considerations

### Frontend Optimizations

- **Lazy Loading**: Routes and components loaded on-demand
- **Virtual Scrolling**: Efficient rendering of large lists
- **Image Optimization**: WebP with fallbacks
- **Service Workers**: Offline support and caching

### Backend Optimizations

- **Database Indexing**: Optimized queries
- **Connection Pooling**: Efficient database connections
- **Redis Caching**: Frequently accessed data cached
- **GraphQL DataLoader**: Batch and cache database queries

## Monitoring & Observability

- **Logging**: Structured logs via Winston
- **Metrics**: Performance and business metrics
- **Error Tracking**: Centralized error reporting
- **Health Checks**: Service availability monitoring

---

**Last Updated:** October 2025  
**Version:** 2.0  
**Status:** Active Development
