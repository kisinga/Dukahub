import { gql } from 'graphql-tag';

export const DASHBOARD_STATS_SCHEMA = gql`
  type AccountBreakdown {
    label: String!
    value: Float!
    icon: String!
  }

  type PeriodStats {
    today: Float!
    week: Float!
    month: Float!
    accounts: [AccountBreakdown!]!
  }

  type DashboardStats {
    sales: PeriodStats!
    purchases: PeriodStats!
    expenses: PeriodStats!
  }

  extend type Query {
    dashboardStats(startDate: DateTime, endDate: DateTime): DashboardStats!
  }
`;
