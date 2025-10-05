# Vendure GAPS

## Architectural

### Multi-Tenancy

Vendure's multi-tenancy is based on the `Channel` concept. Each company is a separate channel.

A `Channel` is a separate instance of the Vendure server.

For every channel, we must manually create a and link a **payment method**.
For every channel, we must manually create a and link a **role**, then assign a user to that role for them to login scoped to that channel.
Unless intentional, each channel must have it's own roles, as users belonging to that role can see all the companies associated with it.
