# Backend Integration Requirements

This document describes all backend changes needed to support the phone-based passwordless authentication system.

## Overview

The frontend is ready and uses mock services. This document outlines what needs to be implemented on the backend to replace the mock services with real functionality.

## GraphQL Operations

### OTP Operations

#### Request Registration OTP

```graphql
mutation RequestRegistrationOTP($phoneNumber: String!) {
  requestRegistrationOTP(phoneNumber: $phoneNumber) {
    success
    message
    expiresAt
  }
}
```

**Implementation:**
- Generate 6-digit OTP code
- Store in Redis with key `otp:phone:{phoneNumber}`
- Set expiry: 5 minutes
- Send OTP via Hostpinnacle SMS API
- Rate limiting: Max 3 requests per phone per 15 minutes
- Return success response with expiry timestamp

#### Verify Registration OTP

```graphql
mutation VerifyRegistrationOTP($phoneNumber: String!, $otp: String!, $registrationData: RegistrationInput!) {
  verifyRegistrationOTP(phoneNumber: $phoneNumber, otp: $otp, registrationData: $registrationData) {
    ... on RegistrationResult {
      success
      userId
      message
    }
    ... on Error {
      errorCode
      message
    }
  }
}
```

**Input Type:**
```typescript
input RegistrationInput {
  companyName: String!
  companyCode: String!
  currency: String!
  adminFirstName: String!
  adminLastName: String!
  adminPhoneNumber: String!
  adminEmail: String
  storeName: String!
  storeAddress: String
}
```

**Implementation:**
- Verify OTP from Redis
- If valid:
  - Create User with `identifier` = `adminPhoneNumber` (formatted)
  - Set `customFields.authorizationStatus` = `PENDING`
  - Create Customer
  - Create Channel
  - Create Stock Location
  - Create Administrator (linked to User)
  - Create Role for channel
  - Assign role to administrator
  - Delete OTP from Redis
  - Return success with userId
- If invalid: Return error

#### Request Login OTP

```graphql
mutation RequestLoginOTP($phoneNumber: String!) {
  requestLoginOTP(phoneNumber: $phoneNumber) {
    success
    message
    expiresAt
  }
}
```

**Implementation:**
- Check if user exists with this phone number as identifier
- Generate 6-digit OTP code
- Store in Redis with key `otp:phone:{phoneNumber}`
- Set expiry: 5 minutes
- Send OTP via Hostpinnacle SMS API
- Rate limiting: Max 3 requests per phone per 15 minutes
- Return success response with expiry timestamp

#### Verify Login OTP

```graphql
mutation VerifyLoginOTP($phoneNumber: String!, $otp: String!) {
  verifyLoginOTP(phoneNumber: $phoneNumber, otp: $otp) {
    ... on LoginResult {
      success
      token
      user {
        id
        identifier
      }
    }
    ... on Error {
      errorCode
      message
    }
  }
}
```

**Implementation:**
- Verify OTP from Redis
- If valid:
  - Find user by identifier (phone number)
  - Check `customFields.authorizationStatus`:
    - If `APPROVED`: Create session, return token/user
    - If `PENDING`: Return error "Account pending approval"
    - If `REJECTED`: Return error "Account rejected"
  - Delete OTP from Redis
- If invalid: Return error

#### Check Authorization Status

```graphql
query CheckAuthorizationStatus($identifier: String!) {
  checkAuthorizationStatus(identifier: $identifier) {
    status
    message
  }
}
```

**Implementation:**
- Find user by identifier (phone number)
- Return current `customFields.authorizationStatus`
- Status: `PENDING`, `APPROVED`, or `REJECTED`

### Authorization Operations

#### Get Pending Registrations

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

#### Approve User

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

#### Reject User

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

## Custom Fields Required

### User Entity

```typescript
{
  name: 'authorizationStatus',
  type: 'string', // Enum preferred if supported
  defaultValue: 'PENDING',
  nullable: false,
  // Values: 'PENDING', 'APPROVED', 'REJECTED'
}
```

## OTP Service Requirements

### Storage

- **Preferred**: Redis cache
  - Key format: `otp:phone:{phoneNumber}`
  - Value: OTP code (6 digits)
  - TTL: 5 minutes (300 seconds)
  - Rate limiting: Store count with key `otp:rate:{phoneNumber}`
    - TTL: 15 minutes
    - Max count: 3

- **Alternative**: Database table
  - Columns: phoneNumber, code, expiresAt, attempts
  - Cleanup: Background job to remove expired entries

### SMS Integration

**Provider**: Hostpinnacle

Configuration via environment variables:
- `HOSTPINNACLE_API_KEY`
- `HOSTPINNACLE_API_URL`
- `HOSTPINNACLE_SENDER_ID`

**SMS Format:**
```
Your Dukahub verification code is: {OTP}. Valid for 5 minutes.
```

**Error Handling:**
- Log SMS sending failures
- Don't expose SMS API errors to users
- Fallback: Log OTP in development mode

## Authentication Strategy

### Custom Authentication Strategy

Extend Vendure's `NativeAuthenticationStrategy`:

1. Override `authenticate()` method
2. Check if OTP verification is in progress (session/token flag)
3. If OTP valid:
   - Bypass password check
   - Check `authorizationStatus`
   - Only allow login if `APPROVED`
4. If OTP invalid/expired:
   - Return authentication error (fully passwordless, no fallback)

**Implementation Notes:**
- OTP verification sets a temporary session flag
- Login mutation uses this flag to bypass password
- Session created after OTP verification succeeds
- No password required or checked

## Database Migrations

1. Add `authorizationStatus` custom field to User entity
2. Update existing users (if any) to `APPROVED` status

## Environment Variables

```env
# OTP Configuration
OTP_EXPIRY_MINUTES=5
OTP_RATE_LIMIT_COUNT=3
OTP_RATE_LIMIT_WINDOW_MINUTES=15

# SMS Provider (Hostpinnacle)
HOSTPINNACLE_API_KEY=your_api_key
HOSTPINNACLE_API_URL=https://api.hostpinnacle.com
HOSTPINNACLE_SENDER_ID=DUKAHUB

# Redis (for OTP storage)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## Migration from Mock Services

The frontend currently uses `OtpMockService`. To switch to real backend:

1. **In `auth.service.ts`**: Uncomment GraphQL mutation calls, remove mock service calls
2. **Remove mock service**: Delete or keep for development fallback
3. **Test**: Verify all OTP flows work with real backend

**Key Changes in AuthService:**
- `requestLoginOTP()`: Replace mock with `REQUEST_LOGIN_OTP` mutation
- `requestRegistrationOTP()`: Replace mock with `REQUEST_REGISTRATION_OTP` mutation
- `verifyLoginOTP()`: Replace mock with `VERIFY_LOGIN_OTP` mutation
- `verifyRegistrationOTP()`: Replace mock with `VERIFY_REGISTRATION_OTP` mutation
- `checkAuthorizationStatus()`: Replace mock with `CHECK_AUTHORIZATION_STATUS` query
- `loginWithOTP()`: Use real GraphQL mutations

## Testing Checklist

- [ ] OTP generation and storage
- [ ] SMS sending via Hostpinnacle
- [ ] OTP verification (valid code)
- [ ] OTP verification (invalid code)
- [ ] OTP verification (expired code)
- [ ] Rate limiting enforcement
- [ ] Registration flow (create user, customer, channel, etc.)
- [ ] Login flow with authorization check
- [ ] Pending user cannot login
- [ ] Rejected user cannot login
- [ ] Approved user can login
- [ ] Admin approval/rejection workflow


