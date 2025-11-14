import { Injectable, OnModuleInit } from '@nestjs/common';
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { gql } from 'graphql-tag';

import { CreditResolver } from './credit.resolver';
import { CustomerFieldResolver } from './customer.resolver';
import { CreditService } from '../../services/credit/credit.service';
import { CreditPaymentSubscriber } from './credit-payment.subscriber';
import { OrderCreationService } from '../../services/orders/order-creation.service';
import { PriceOverrideService } from '../../services/orders/price-override.service';
import { OrderAddressService } from '../../services/orders/order-address.service';
import { OrderCreditValidatorService } from '../../services/orders/order-credit-validator.service';
import { OrderFulfillmentService } from '../../services/orders/order-fulfillment.service';
import { OrderItemService } from '../../services/orders/order-item.service';
import { OrderPaymentService } from '../../services/orders/order-payment.service';
import { OrderStateService } from '../../services/orders/order-state.service';
import { PaymentAllocationService } from '../../services/payments/payment-allocation.service';
import { PaymentAllocationResolver } from './payment-allocation.resolver';
import { setPaymentHandlerCreditService } from '../../services/payments/payment-handlers';
import {
    ApproveCustomerCreditPermission,
    ManageCustomerCreditLimitPermission
} from './permissions';

// Merge both schemas into a single DocumentNode
const COMBINED_SCHEMA = gql`
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

    input CartItemInput {
        variantId: ID!
        quantity: Float!
        customLinePrice: Int
        priceOverrideReason: String
    }

    input CreateOrderInput {
        cartItems: [CartItemInput!]!
        paymentMethodCode: String!
        customerId: ID
        metadata: JSON
        isCreditSale: Boolean
        isCashierFlow: Boolean
    }

    type PaymentAllocationResult {
        ordersPaid: [OrderPayment!]!
        remainingBalance: Float!
        totalAllocated: Float!
    }

    type OrderPayment {
        orderId: ID!
        orderCode: String!
        amountPaid: Float!
    }

    input PaymentAllocationInput {
        customerId: ID!
        paymentAmount: Float!
        orderIds: [ID!]
    }

    type CreditValidationResult {
        isValid: Boolean!
        error: String
        availableCredit: Float!
        estimatedOrderTotal: Float!
        wouldExceedLimit: Boolean!
    }

    input ValidateCreditInput {
        customerId: ID!
        estimatedOrderTotal: Float!
    }

    extend type Customer {
        outstandingAmount: Float!
    }

    extend type Query {
        creditSummary(customerId: ID!): CreditSummary!
        unpaidOrdersForCustomer(customerId: ID!): [Order!]!
        validateCredit(input: ValidateCreditInput!): CreditValidationResult!
    }

    extend type Mutation {
        approveCustomerCredit(input: ApproveCustomerCreditInput!): CreditSummary!
        updateCustomerCreditLimit(input: UpdateCustomerCreditLimitInput!): CreditSummary!
        updateCreditDuration(input: UpdateCreditDurationInput!): CreditSummary!
        createOrder(input: CreateOrderInput!): Order!
        allocateBulkPayment(input: PaymentAllocationInput!): PaymentAllocationResult!
    }
`;

// Service to initialize payment handler service reference
@Injectable()
class PaymentHandlerInitializer implements OnModuleInit {
    constructor(private creditService: CreditService) {}

    onModuleInit() {
        // Set the credit service reference for payment handlers
        setPaymentHandlerCreditService(this.creditService);
    }
}

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        CreditService,
        CreditResolver,
        CustomerFieldResolver,
        CreditPaymentSubscriber,
        PaymentHandlerInitializer,
        OrderCreationService,
        PriceOverrideService,
        OrderAddressService,
        OrderCreditValidatorService,
        OrderFulfillmentService,
        OrderItemService,
        OrderPaymentService,
        OrderStateService,
        PaymentAllocationService,
        PaymentAllocationResolver,
    ],
    configuration: (config) => {
        // Register custom permissions
        config.authOptions.customPermissions = [
            ...(config.authOptions.customPermissions || []),
            ApproveCustomerCreditPermission,
            ManageCustomerCreditLimitPermission,
        ];
        return config;
    },
    adminApiExtensions: {
        schema: COMBINED_SCHEMA,
        resolvers: [CreditResolver, CustomerFieldResolver, PaymentAllocationResolver],
    },
})
export class CreditPlugin { }

