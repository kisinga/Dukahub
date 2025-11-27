# Company Admins Feature - Quick Start Guide

**Quick reference for continuing implementation**

## 🎯 Current Status

- ✅ **Backend:** 100% complete, builds successfully
- ⚠️ **Frontend:** 90% complete, needs GraphQL codegen
- ⚠️ **Testing:** Not started

## 🚀 Quick Start (5 minutes)

### 1. Start Backend
```bash
cd backend
npm run start:dev
# Wait for "Application is running" message
```

### 2. Generate GraphQL Types
```bash
cd frontend
npm run codegen
```

### 3. Verify Builds
```bash
# Backend (should already pass)
cd backend && npm run build

# Frontend (should pass after codegen)
cd frontend && npm run build
```

## 📍 Key Files to Know

### Backend
- **Role Templates:** `backend/src/services/auth/provisioning/role-provisioner.service.ts`
- **Service Logic:** `backend/src/services/channels/channel-settings.service.ts`
- **GraphQL API:** `backend/src/plugins/channels/channel-settings.resolver.ts`
- **Migration:** `backend/src/migrations/1000000000008-AddChannelMaxAdminCount.ts`

### Frontend
- **Service:** `frontend/src/app/core/services/team.service.ts`
- **Main Page:** `frontend/src/app/dashboard/pages/team/team.component.ts`
- **GraphQL Ops:** `frontend/src/app/core/graphql/operations.graphql.ts`

## 🐛 Common Issues

### Frontend Build Fails
**Problem:** Missing GraphQL types  
**Solution:** Run `npm run codegen` in frontend directory (backend must be running)

### Codegen Fails
**Problem:** Backend not running  
**Solution:** Start backend first, wait for it to fully initialize

### Migration Not Running
**Problem:** Migration file not detected  
**Solution:** Check migration file is in `backend/src/migrations/` and follows naming pattern

## ✅ Next Actions

1. **Immediate:** Run codegen to fix frontend build
2. **Short-term:** Test the feature end-to-end
3. **Medium-term:** Enhance permission editor UI
4. **Long-term:** Add comprehensive tests

## 📖 Full Documentation

See `.cursor/plans/company-admins-implementation-status.md` for complete details.

