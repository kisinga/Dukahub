# Dukahub Frontend

Angular admin dashboard for Dukahub - Built for Kenyan SMEs.

## Setup

```bash
npm install
npm start  # http://localhost:4200
```

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
npm test              # Run tests
npm run codegen       # Generate GraphQL types
```

## Environment

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: '/admin-api',  // Relative URL - proxied to backend
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
