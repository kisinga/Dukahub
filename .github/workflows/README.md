# GitHub Actions Workflows

This directory contains the CI/CD workflows for the Dukahub project.

## Workflow Overview

### 1. `backend-tests.yml`

- **Purpose**: Runs backend-specific tests
- **Triggers**: Changes to `backend/**` or the workflow file itself
- **Branches**: `main`, `develop`
- **Node.js**: v20
- **Tests**: Backend build and test suite

### 2. `frontend-tests.yml`

- **Purpose**: Runs frontend-specific tests
- **Triggers**: Changes to `frontend/**` or the workflow file itself
- **Branches**: `main`, `develop`
- **Node.js**: v20
- **Tests**: Frontend build and test suite

### 3. `ci.yml`

- **Purpose**: Comprehensive CI that runs both backend and frontend tests
- **Triggers**: All pushes and PRs to `main`/`develop` branches
- **Branches**: `main`, `develop`
- **Node.js**: v20
- **Tests**: Both backend and frontend test suites

### 4. `build-and-push.yml`

- **Purpose**: Builds and pushes Docker images
- **Triggers**: Changes to backend/frontend code or Docker files
- **Branches**: `main`, `master`
- **Output**: Docker images to GitHub Container Registry

## Branch Protection Setup

To require these tests for merging to main:

1. Go to repository Settings → Branches
2. Add rule for `main` branch
3. Enable "Require status checks to pass before merging"
4. Select the required status checks:
   - `backend-tests` (from backend-tests.yml)
   - `frontend-tests` (from frontend-tests.yml)
   - Or `CI Tests` (from ci.yml for comprehensive testing)

## Workflow Selection

- **For focused testing**: Use individual `backend-tests.yml` or `frontend-tests.yml`
- **For comprehensive testing**: Use `ci.yml`
- **For production builds**: Use `build-and-push.yml`

## Node.js Version

All workflows use Node.js v20 to ensure compatibility with Angular CLI requirements.
