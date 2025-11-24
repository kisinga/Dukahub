<!-- f6fce943-1397-4448-9c37-2852fe35ed2b de3c1729-9de2-4660-8295-97b90579cdd6 -->
# Fix Auth Flow to Allow Read-Only Login for UNAPPROVED Channels

## Problem

The current implementation in `verifyLoginOTP` blocks login entirely when no APPROVED channel exists, contradicting the documented behavior. According to `docs/CHANNEL_STATUS_AUTH.md` and `docs/AUTHORIZATION_WORKFLOW.md`, users with UNAPPROVED channels should be able to login with READ_ONLY access (queries allowed, mutations blocked).

## Current Behavior

- User registers → account provisioned with UNAPPROVED channel
- User tries to login → receives SMS → OTP verified → **login blocked** with message "Your business is pending approval"
- User cannot access their account at all until admin approves

## Target Behavior

- User registers → account provisioned with UNAPPROVED channel  
- User tries to login → receives SMS → OTP verified → **login succeeds with READ_ONLY access**
- User can view their account data but cannot perform mutations
- Once admin approves channel → user gets FULL access on next login

## Implementation

### File: `backend/src/services/auth/phone-auth.service.ts`

**Change in `verifyLoginOTP` method (lines 327-338):**

Current logic blocks login if no APPROVED channel exists. Need to change to:

1. If any channel is APPROVED → use first APPROVED channel with FULL access
2. If all channels are UNAPPROVED → use first UNAPPROVED channel with READ_ONLY access
3. Only block login if channels are DISABLED/BANNED (already handled correctly above)

**Specific changes:**

- Remove the early return that blocks login when `!approvedChannel`
- Instead, check if all channels are UNAPPROVED and set `accessLevel = AccessLevel.READ_ONLY`
- Use the first available channel (UNAPPROVED or APPROVED) for the session
- Fix typo in error message: "loigin" → "login" (line 335)

### Logic Flow

```
After checking DISABLED/BANNED channels (lines 313-325):
1. Find first APPROVED channel
2. If APPROVED channel exists:
   - accessLevel = FULL
   - channelId = approved channel
3. Else (all channels are UNAPPROVED):
   - accessLevel = READ_ONLY  
   - channelId = first UNAPPROVED channel
4. Create session with accessLevel and channelId
```

## Testing Considerations

- Verify users with UNAPPROVED channels can login and see their data
- Verify mutations are blocked for READ_ONLY users (handled by ChannelAccessGuardService)
- Verify queries work for READ_ONLY users
- Verify users with APPROVED channels still get FULL access
- Verify DISABLED/BANNED channels still block login

## Related Files

- `backend/src/services/auth/channel-access-guard.service.ts` - Already correctly implements read-only enforcement for UNAPPROVED channels
- `docs/CHANNEL_STATUS_AUTH.md` - Documents the intended behavior
- `docs/AUTHORIZATION_WORKFLOW.md` - Documents the two-tier authorization system

### To-dos

- [ ] Update verifyLoginOTP method to allow login with READ_ONLY access when all channels are UNAPPROVED, instead of blocking login entirely
- [ ] Fix typo in error message: 'loigin' → 'login'