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

  type CashierSession {
    id: ID!
    channelId: Int!
    cashierUserId: Int!
    openedAt: DateTime!
    closedAt: DateTime
    openingFloat: String!
    closingDeclared: String!
    status: String!
  }

  type CashierSessionLedgerTotals {
    cashTotal: String!
    mpesaTotal: String!
    totalCollected: String!
  }

  type CashierSessionSummary {
    sessionId: ID!
    cashierUserId: Int!
    openedAt: DateTime!
    closedAt: DateTime
    status: String!
    openingFloat: String!
    closingDeclared: String!
    ledgerTotals: CashierSessionLedgerTotals!
    variance: String!
  }

  type CashierSessionList {
    items: [CashierSession!]!
    totalItems: Int!
  }

  input OpenCashierSessionInput {
    channelId: Int!
    openingFloat: String!
  }

  input CloseCashierSessionInput {
    sessionId: ID!
    closingDeclared: String!
    notes: String
  }

  input CashierSessionListOptions {
    status: String
    startDate: DateTime
    endDate: DateTime
    take: Int
    skip: Int
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
    currentCashierSession(channelId: Int!): CashierSession
    cashierSession(sessionId: ID!): CashierSessionSummary
    cashierSessions(channelId: Int!, options: CashierSessionListOptions): CashierSessionList!
  }

  extend type Mutation {
    createReconciliation(input: CreateReconciliationInput!): Reconciliation!
    verifyReconciliation(reconciliationId: ID!): Reconciliation!
    closeAccountingPeriod(channelId: Int!, periodEndDate: DateTime!): PeriodEndCloseResult!
    openAccountingPeriod(channelId: Int!, periodStartDate: DateTime!): AccountingPeriod!
    createInventoryReconciliation(input: CreateInventoryReconciliationInput!): Reconciliation!
    createInterAccountTransfer(input: InterAccountTransferInput!): JournalEntry!
    openCashierSession(input: OpenCashierSessionInput!): CashierSession!
    closeCashierSession(input: CloseCashierSessionInput!): CashierSessionSummary!
    createCashierSessionReconciliation(sessionId: ID!, notes: String): Reconciliation!
  }
`;
