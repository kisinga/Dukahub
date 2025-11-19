# Renaming to Dukarun

**Date:** November 19, 2025

## Context
The project was originally named "Dukahub". However, during the business registration process, it was discovered that the name "Dukahub" was already taken or unavailable.

## Decision
The project has been renamed to **"Dukarun"**. This name was successfully registered and is now the official business name.

## Scope of Changes
- **Codebase**: All references to "Dukahub" in code, configuration, and comments have been updated to "Dukarun".
- **Infrastructure**: Docker images, service names, and observability resources have been renamed.
- **Documentation**: All documentation has been updated to reflect the new name.
- **Archive**: Files in the `archive/` directory retain the original "dukahub" references for historical accuracy and are intentionally excluded from the renaming process.

## Brand Constants
To facilitate future rebrands or white-labeling, brand constants have been introduced:
- Frontend: `frontend/src/app/core/constants/brand.constants.ts`
- Backend: `backend/src/constants/brand.constants.ts`

All code should reference these constants instead of hardcoding the brand name.
