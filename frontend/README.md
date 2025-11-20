# Dukarun Frontend

Angular admin dashboard for Dukarun - Built for Kenyan SMEs.

## Setup

```bash
npm install
npm start  # http://localhost:4200
```

**⚠️ Note:** SigNoz observability tracing is **NOT available** in development mode (`ng serve`). The Angular dev server's `proxy.conf.json` is static and cannot proxy `/signoz/` requests. Use Docker Compose for testing observability features.

## Tech Stack

- Angular 20.3 (Standalone + Signals)
- Apollo Client (GraphQL)
- Tailwind CSS 4 + daisyUI 5
- Vendure Backend

## Authentication

**Endpoint:** `admin-api` (not shop-api)  
**Default credentials:** `superadmin` / `superadmin`

```typescript
// Services: inject() pattern + signals
authService.login({ username, password });
authService.user(); // Signal
authService.isAuthenticated(); // Computed signal
```

## GraphQL Codegen

```bash
npm run codegen         # Generate types (backend must be running)
npm run codegen:watch   # Watch mode
```

## Structure

```
src/app/
├── core/
│   ├── services/     # apollo, auth, cart
│   ├── guards/       # authGuard, noAuthGuard
│   ├── graphql/      # queries/mutations
│   └── models/       # types
├── pages/            # login, landing
└── dashboard/        # admin pages
```

## Scripts

```bash
npm start             # Dev server
npm run build         # Production build
npm test              # Run tests (requires Chrome)
npm run test:ci       # Run tests with coverage (CI mode)
npm run codegen       # Generate GraphQL types
```

## Testing

**Test Strategy:** We focus on **integration tests** for service behavior and critical workflows. UI/component tests are intentionally minimal at this stage as the UI may undergo significant changes.

**Test Types:**

- **Integration Tests:** Service integration, critical workflows, behavioral smoke tests
- **Component Tests:** Minimal - only essential component tests (e.g., app initialization)

**Requirements:** Chrome must be installed to run tests.

- **Local development:** Install Chrome on your system
  - Install with: `sudo apt-get install google-chrome-stable` (Debian/Ubuntu) or download from [Google Chrome](https://www.google.com/chrome/)
  - If you see `ERROR [launcher]: No binary for ChromeHeadless browser on your platform`, Chrome is not installed
- **CI:** Chrome is installed automatically in the GitHub Actions workflow

## Environment

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: '/admin-api', // Relative URL - proxied to backend
};
```

## Remote Backend Development

**Problem:** Browsers don't send cookies between different domains (localhost → homelab).

**Solution:** Angular dev server proxy (`proxy.conf.json`) makes everything same-origin:

```
Browser → localhost:4200/admin-api → [Proxy] → homelab:3000/admin-api
```

Change target in `proxy.conf.json` to your backend URL. Cookies work because browser sees everything as localhost.

## Common Issues

**"Invalid credentials"**: Use `superadmin`/`superadmin` (admin-api, not shop-api)  
**CORS errors**: Check backend `vendure-config.ts` CORS settings  
**Codegen fails**: Ensure backend is running on port 3000

## More Info

- [Architecture](./ARCHITECTURE.md) - App structure
- [Dashboard UX](./DASHBOARD_UX.md) - Design principles
- [Migration Status](./MIGRATION_STATUS.md) - v1 → v2 progress
