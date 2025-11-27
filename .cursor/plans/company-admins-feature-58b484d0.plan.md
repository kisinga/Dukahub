<!-- 58b484d0-f772-4280-b4df-860f8746b379 e9dda2f4-471d-4d68-990f-81f8e89bffab -->
# Company Admins Feature

## Role Templates

| Role | Purpose | Key Permissions |

|------|---------|-----------------|

| **Admin** | Full access | All permissions |

| **Cashier** | Payment processing | UpdateOrder, ReadOrder, ApproveCustomerCredit, ManageReconciliation |

| **Accountant** | Financial oversight | ManageReconciliation, CloseAccountingPeriod, ManageCustomerCreditLimit, ManageSupplierCreditPurchases |

| **Salesperson** | Sales operations | CreateOrder, CreateCustomer, ReadProduct, OverridePrice |

| **Stockkeeper** | Inventory management | CreateProduct, UpdateProduct, ManageStockAdjustments, ReadStockLocation |

---

## Backend Changes

### 1. Role Templates Constant

Add to [role-provisioner.service.ts](backend/src/services/auth/provisioning/role-provisioner.service.ts):

```typescript
export const ROLE_TEMPLATES: Record<string, { name: string; description: string; permissions: Permission[] }> = {
  admin: { name: 'Admin', description: 'Full system access', permissions: ALL_ADMIN_PERMISSIONS },
  cashier: { name: 'Cashier', description: 'Payment and credit approval', permissions: [...] },
  // ... other templates
};
```

### 2. Extend ChannelSettingsService

Modify [channel-settings.service.ts](backend/src/services/channels/channel-settings.service.ts):

- `getRoleTemplates()` - Returns available templates
- Refactor `inviteChannelAdministrator()` to accept `phoneNumber`, `roleTemplateCode`, `permissionOverrides`
- Add `updateChannelAdministrator()`, `disableChannelAdministrator()`
- Add rate limit check using existing `ChannelActionTrackingService`

### 3. Extend GraphQL Schema

Modify [channel-settings.resolver.ts](backend/src/plugins/channels/channel-settings.resolver.ts):

```graphql
type RoleTemplate { code: String!, name: String!, description: String!, permissions: [String!]! }

input CreateChannelAdminInput {
  firstName: String!, lastName: String!, phoneNumber: String!
  roleTemplateCode: String!, permissionOverrides: [String!]
}

extend type Query { roleTemplates: [RoleTemplate!]! }
extend type Mutation { 
  createChannelAdmin(input: CreateChannelAdminInput!): Administrator!
  updateChannelAdmin(id: ID!, permissions: [String!]!): Administrator!
  disableChannelAdmin(id: ID!): DeletionResponse!
}
```

### 4. Add Channel Custom Field

Add `maxAdminCount` (int, default: 5) to Channel customFields in [vendure-config.ts](backend/src/vendure-config.ts).

### 5. Fix Event Counter Tracking

Ensure `ADMIN_CREATED` event is emitted in admin creation flow and tracked via `ChannelActionTrackingService`.

---

## Frontend Changes

### 1. Team Page Structure

Create `frontend/src/app/dashboard/pages/team/`:

```
team/
├── team.component.ts         # List with stats, search, table/cards
├── team.component.html
├── components/
│   ├── team-member-row.component.ts    # Table row + card (responsive)
│   ├── create-admin-modal.component.ts # Multi-step wizard
│   └── permission-editor.component.ts  # Grouped toggles (reusable)
```

### 2. TeamService

Create `frontend/src/app/core/services/team.service.ts`:

```typescript
@Injectable({ providedIn: 'root' })
export class TeamService {
  readonly members = signal<Administrator[]>([]);
  readonly roleTemplates = signal<RoleTemplate[]>([]);
  readonly isLoading = signal(false);
  
  loadMembers(): Promise<void>;
  loadRoleTemplates(): Promise<void>;
  createMember(input): Promise<Administrator>;
  updateMember(id, permissions): Promise<Administrator>;
  deleteMember(id): Promise<boolean>;
}
```

### 3. Multi-Step Create Modal

4 steps following existing modal patterns:

1. **Info**: Name, phone (required), email (optional)
2. **Role**: Select template (shows permission summary)
3. **Permissions**: Toggle overrides (pre-filled from template)
4. **Confirm**: Re-enter phone number to confirm

### 4. Route & Navigation

Add route `/dashboard/team` in [app.routes.ts](frontend/src/app/app.routes.ts), add nav item to sidebar.

---

## Key Design Decisions

- **Reuse existing infrastructure**: Vendure's Administrator, Role, User entities; existing phone auth flow
- **Single service file**: Extend `ChannelSettingsService` rather than new service class
- **Templates as constants**: No database table for templates - just code constants
- **Permission overrides**: Stored as custom Role per admin, not template modification
- **Phone confirmation**: Simple re-entry validation, not separate OTP for creation

### To-dos

- [ ] Create role template definitions with permission sets for Admin, Cashier, Accountant, Salesperson
- [ ] Create ChannelAdminService with CRUD operations and rate limiting
- [ ] Extend GraphQL schema with role templates, admin queries and mutations
- [ ] Implement admin count rate limiter with maxAdminCount channel custom field
- [ ] Fix event counter tracking and link to correct data sources
- [ ] Add welcome SMS notification for new admin invitations
- [ ] Create dedicated /dashboard/team page with list, search, stats
- [ ] Build multi-step admin creation form with phone confirmation
- [ ] Create reusable permission editor component with grouped toggles
- [ ] Create TeamService with signals and GraphQL operations
- [ ] Add Team route and navigation, update Settings page