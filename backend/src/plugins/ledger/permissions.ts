import { PermissionDefinition } from '@vendure/core';

export const ManageReconciliationPermission = new PermissionDefinition({
  name: 'ManageReconciliation',
  description: 'Allows creating and verifying reconciliations for all scopes.',
});

export const CloseAccountingPeriodPermission = new PermissionDefinition({
  name: 'CloseAccountingPeriod',
  description: 'Allows closing accounting periods after reconciliation verification.',
});

export const CreateInterAccountTransferPermission = new PermissionDefinition({
  name: 'CreateInterAccountTransfer',
  description: 'Allows creating inter-account transfers during reconciliation sessions.',
});
