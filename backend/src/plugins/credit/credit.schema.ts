import { gql } from 'graphql-tag';

export const CREDIT_ADMIN_SCHEMA = gql`
    type CreditSummary {
        customerId: ID!
        isCreditApproved: Boolean!
        creditLimit: Float!
        outstandingAmount: Float!
        availableCredit: Float!
        lastRepaymentDate: DateTime
        lastRepaymentAmount: Float!
        creditDuration: Int!
    }

    input ApproveCustomerCreditInput {
        customerId: ID!
        approved: Boolean!
        creditLimit: Float
        creditDuration: Int
    }

    input UpdateCustomerCreditLimitInput {
        customerId: ID!
        creditLimit: Float!
        creditDuration: Int
    }

    input UpdateCreditDurationInput {
        customerId: ID!
        creditDuration: Int!
    }

    extend type Query {
        creditSummary(customerId: ID!): CreditSummary!
    }

    extend type Mutation {
        approveCustomerCredit(input: ApproveCustomerCreditInput!): CreditSummary!
        updateCustomerCreditLimit(input: UpdateCustomerCreditLimitInput!): CreditSummary!
        updateCreditDuration(input: UpdateCreditDurationInput!): CreditSummary!
    }
`;

