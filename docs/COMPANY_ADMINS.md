# Company Admins Feature

Channel administrators can manage team members with role-based permissions.

## Features

- **Role Templates**: 5 predefined roles (Admin, Cashier, Accountant, Salesperson, Stockkeeper)
- **Admin Management**: Create, update, and disable channel administrators
- **Permission Overrides**: Customize permissions per admin
- **Rate Limiting**: Configurable max admin count per channel (default: 5)

## Backend

### GraphQL API

- `roleTemplates` - List available role templates
- `createChannelAdmin` - Create admin with phone number and role template
- `updateChannelAdmin` - Update admin permissions
- `disableChannelAdmin` - Remove admin
- `inviteChannelAdministrator` - Invite admin (requires phone number, email optional)

### Key Files

- `backend/src/services/auth/provisioning/role-provisioner.service.ts` - Role templates
- `backend/src/services/channels/channel-settings.service.ts` - Admin management logic
- `backend/src/plugins/channels/channel-settings.resolver.ts` - GraphQL resolvers
- `backend/src/migrations/1000000000008-AddChannelMaxAdminCount.ts` - Migration

## Frontend

### Team Page

Route: `/dashboard/team`

- View team members with stats
- Search and filter
- Create new admins via multi-step modal
- Edit permissions
- Delete admins

### Key Files

- `frontend/src/app/core/services/team.service.ts` - Team management service
- `frontend/src/app/dashboard/pages/team/` - Team page components
- `frontend/src/app/core/graphql/operations.graphql.ts` - GraphQL operations

## Role Templates

| Role        | Description          | Key Permissions                             |
| ----------- | -------------------- | ------------------------------------------- |
| Admin       | Full system access   | All permissions                             |
| Cashier     | Payment processing   | UpdateOrder, ApproveCustomerCredit          |
| Accountant  | Financial oversight  | ManageReconciliation, CloseAccountingPeriod |
| Salesperson | Sales operations     | CreateOrder, CreateCustomer, OverridePrice  |
| Stockkeeper | Inventory management | CreateProduct, ManageStockAdjustments       |

## Configuration

Channel custom field: `maxAdminCount` (default: 5)

## Notes

- Phone number is required for all admin creation
- Permissions are stored per role, one role per admin per channel
- Admin deletion removes entity and associated roles
