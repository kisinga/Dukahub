# Authorization Workflow Documentation

This document describes the admin approval workflow for new user registrations.

## Overview

All new user registrations enter a `PENDING_AUTHORIZATION` state. An admin must manually approve or reject each registration before the user can access the system.

## Authorization Status Flow

```
REGISTRATION → PENDING → APPROVED (can login)
                      ↘ REJECTED (cannot login)
```

## User States

### PENDING
- Initial state after successful registration
- User cannot login
- Admin review required

### APPROVED
- User can login and access the system
- Full system access granted

### REJECTED
- User cannot login
- Registration was rejected by admin
- Reason should be stored for reference

## GraphQL Operations Required

### Query: Get Pending Registrations

```graphql
query GetPendingRegistrations {
  pendingRegistrations {
    id
    identifier
    createdAt
    customFields {
      authorizationStatus
    }
    administrator {
      id
      firstName
      lastName
      emailAddress
    }
  }
}
```

### Mutation: Approve User

```graphql
mutation ApproveUser($userId: ID!) {
  approveUser(userId: $userId) {
    id
    identifier
    customFields {
      authorizationStatus
    }
  }
}
```

### Mutation: Reject User

```graphql
mutation RejectUser($userId: ID!, $reason: String) {
  rejectUser(userId: $userId, reason: $reason) {
    id
    identifier
    customFields {
      authorizationStatus
    }
  }
}
```

### Query: Check Authorization Status

```graphql
query CheckAuthorizationStatus($identifier: String!) {
  checkAuthorizationStatus(identifier: $identifier) {
    status
    message
  }
}
```

**Status Values:**
- `PENDING`: Account awaiting approval
- `APPROVED`: Account approved and can login
- `REJECTED`: Account rejected

## Backend Implementation Requirements

### User Entity Custom Field

Add custom field to User entity:

```typescript
{
  name: 'authorizationStatus',
  type: 'string', // Or enum if supported
  label: [{ languageCode: LanguageCode.en, value: 'Authorization Status' }],
  description: [{ languageCode: LanguageCode.en, value: 'User authorization status for login access' }],
  defaultValue: 'PENDING',
  public: false,
  nullable: false,
  // Enum values: PENDING, APPROVED, REJECTED
}
```

### Service Methods

1. **Get Pending Registrations**
   - Query users where `customFields.authorizationStatus === 'PENDING'`
   - Include administrator details
   - Sort by `createdAt` (newest first)

2. **Approve User**
   - Update `customFields.authorizationStatus` to `APPROVED`
   - Optionally send notification to user
   - Return updated user

3. **Reject User**
   - Update `customFields.authorizationStatus` to `REJECTED`
   - Store rejection reason (if provided)
   - Optionally send notification to user
   - Return updated user

4. **Check Authorization Status**
   - Find user by identifier (phone number)
   - Return current authorization status
   - Used during login to verify user can access system

### Authentication Strategy Integration

The authentication strategy must check `authorizationStatus` before allowing login:

1. User requests OTP
2. User verifies OTP
3. System checks `authorizationStatus`:
   - If `APPROVED`: Allow login
   - If `PENDING`: Reject with message "Account pending approval"
   - If `REJECTED`: Reject with message "Account rejected. Contact support."

## Admin UI Recommendations

### Pending Registrations Page

1. List view showing:
   - User identifier (phone number)
   - Admin name (firstName + lastName)
   - Company name
   - Registration date
   - Actions: Approve / Reject buttons

2. Detail view showing:
   - All registration fields
   - Company information
   - Store information
   - Approve / Reject actions with reason input

3. Filters:
   - Status filter (PENDING, APPROVED, REJECTED)
   - Date range filter
   - Search by phone number or company name

### Actions

- **Approve**: One-click approval, updates status immediately
- **Reject**: Opens modal with optional reason field
- **Bulk Actions**: Approve/reject multiple registrations at once

## Notification Requirements

When a user is approved or rejected, consider sending notifications:

- **Approved**: SMS or email notification that account is ready
- **Rejected**: SMS or email notification with reason (if provided)

## Security Considerations

1. Only users with appropriate admin permissions can approve/reject
2. Log all approval/rejection actions for audit trail
3. Rejection reasons should be stored but not exposed to regular users
4. Rate limiting on approval/rejection actions to prevent abuse







