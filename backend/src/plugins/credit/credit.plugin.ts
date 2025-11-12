import { Injectable, OnModuleInit } from '@nestjs/common';
import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { CREDIT_ADMIN_SCHEMA } from './credit.schema';
import { CreditResolver } from './credit.resolver';
import { CreditService } from '../../services/credit/credit.service';
import { CreditPaymentSubscriber } from './credit-payment.subscriber';
import { setPaymentHandlerCreditService } from '../../services/payments/payment-handlers';
import {
    ApproveCustomerCreditPermission,
    ManageCustomerCreditLimitPermission
} from './permissions';

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
    providers: [CreditService, CreditResolver, CreditPaymentSubscriber, PaymentHandlerInitializer],
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
        schema: CREDIT_ADMIN_SCHEMA,
        resolvers: [CreditResolver],
    },
})
export class CreditPlugin { }

