import { gql } from 'graphql-tag';

export const PERIOD_MANAGEMENT_SCHEMA = gql`
  type AccountingPeriod {
    id: ID!
    channelId: Int!
    startDate: DateTime!
    endDate: DateTime!
    status: String!
    closedBy: Int
    closedAt: DateTime
  }

  type PeriodStatus {
    currentPeriod: AccountingPeriod
    isLocked: Boolean!
    lockEndDate: DateTime
    canClose: Boolean!
    missingReconciliations: [String!]!
  }

  type ReconciliationStatus {
    periodEndDate: DateTime!
    scopes: [ScopeReconciliationStatus!]!
  }

  type ScopeReconciliationStatus {
    scope: String!
    scopeRefId: String!
    status: String!
    varianceAmount: String
    displayName: String
  }

  type PeriodEndCloseResult {
    success: Boolean!
    period: AccountingPeriod!
    reconciliationSummary: ReconciliationSummary!
  }

  type ReconciliationSummary {
    periodEndDate: DateTime!
    scopes: [ScopeReconciliationStatus!]!
  }

  type InventoryValuation {
    channelId: Int!
    stockLocationId: Int
    asOfDate: DateTime!
    totalValue: String!
    batchCount: Int!
    itemCount: Int!
  }

  type Reconciliation {
    id: ID!
    channelId: Int!
    scope: String!
    scopeRefId: String!
    rangeStart: DateTime!
    rangeEnd: DateTime!
    status: String!
    expectedBalance: String
    actualBalance: String
    varianceAmount: String!
    notes: String
    createdBy: Int!
    reviewedBy: Int
  }

  input CreateReconciliationInput {
    channelId: Int!
    scope: String!
    scopeRefId: String!
    rangeStart: DateTime!
    rangeEnd: DateTime!
    expectedBalance: String
    actualBalance: String!
    notes: String
  }

  input CreateInventoryReconciliationInput {
    channelId: Int!
    periodEndDate: DateTime!
    stockLocationId: Int
    actualBalance: String!
    notes: String
  }

  input InterAccountTransferInput {
    channelId: Int!
    fromAccountCode: String!
    toAccountCode: String!
    amount: String! # in smallest currency unit
    entryDate: DateTime!
    memo: String
  }

  extend type Query {
    currentPeriodStatus(channelId: Int!): PeriodStatus!
    periodReconciliationStatus(channelId: Int!, periodEndDate: DateTime!): ReconciliationStatus!
    closedPeriods(channelId: Int!, limit: Int, offset: Int): [AccountingPeriod!]!
    inventoryValuation(
      channelId: Int!
      asOfDate: DateTime!
      stockLocationId: Int
    ): InventoryValuation!
  }

  extend type Mutation {
    createReconciliation(input: CreateReconciliationInput!): Reconciliation!
    verifyReconciliation(reconciliationId: ID!): Reconciliation!
    closeAccountingPeriod(channelId: Int!, periodEndDate: DateTime!): PeriodEndCloseResult!
    openAccountingPeriod(channelId: Int!, periodStartDate: DateTime!): AccountingPeriod!
    createInventoryReconciliation(input: CreateInventoryReconciliationInput!): Reconciliation!
    createInterAccountTransfer(input: InterAccountTransferInput!): JournalEntry!
  }
`;
