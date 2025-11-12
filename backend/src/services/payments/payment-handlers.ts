import {
    CreatePaymentResult,
    LanguageCode,
    PaymentMethodHandler,
    SettlePaymentResult,
    UserInputError
} from '@vendure/core';

// Service locator for CreditService
// This will be set by the plugin when it initializes
let creditServiceRef: any | null = null;

export function setPaymentHandlerCreditService(creditService: any): void {
    creditServiceRef = creditService;
}

/**
 * Cash Payment Handler
 * 
 * Immediately settles payment as cash transactions are instant.
 * No external API integration required.
 */
export const cashPaymentHandler = new PaymentMethodHandler({
    code: 'cash-payment',
    description: [{
        languageCode: LanguageCode.en,
        value: 'Cash Payment - Immediate settlement'
    }],
    args: {},

    createPayment: async (ctx, order, amount, args, metadata): Promise<CreatePaymentResult> => {
        return {
            amount: order.total,
            state: 'Settled' as const,
            transactionId: `CASH-${Date.now()}`,
            metadata: {
                paymentType: 'cash',
                ...(metadata || {})
            }
        };
    },

    settlePayment: async (): Promise<SettlePaymentResult> => {
        // Already settled in createPayment
        return { success: true };
    }
});

/**
 * M-Pesa Payment Handler
 * 
 * Currently a stub that immediately settles payments.
 * Future enhancement: Integrate with M-Pesa STK Push API for real-time payment processing.
 * 
 * TODO: Implement M-Pesa API integration
 * - Trigger STK Push to customer's phone
 * - Wait for callback confirmation
 * - Update payment state based on API response
 */
export const mpesaPaymentHandler = new PaymentMethodHandler({
    code: 'mpesa-payment',
    description: [{
        languageCode: LanguageCode.en,
        value: 'M-Pesa Payment - Mobile money (stub for future API integration)'
    }],
    args: {},

    createPayment: async (ctx, order, amount, args, metadata): Promise<CreatePaymentResult> => {
        // TODO: Future - Trigger STK Push, await callback
        // For now, mark as settled immediately
        return {
            amount: order.total,
            state: 'Settled' as const,
            transactionId: `MPESA-${Date.now()}`,
            metadata: {
                paymentType: 'mpesa',
                phoneNumber: metadata?.phoneNumber || null, // Capture for future API integration
                ...(metadata || {})
            }
        };
    },

    settlePayment: async (): Promise<SettlePaymentResult> => {
        // Already settled (future: handle async confirmation)
        return { success: true };
    }
});

/**
 * Credit Payment Handler
 */
export const creditPaymentHandler = new PaymentMethodHandler({
    code: 'credit-payment',
    description: [{
        languageCode: LanguageCode.en,
        value: 'Customer credit payment',
    }],
    args: {},
    createPayment: async (ctx, order): Promise<CreatePaymentResult> => {
        const customerId = order.customer?.id;

        if (!customerId) {
            throw new UserInputError('Credit payments require an associated customer.');
        }

        // Get CreditService from service locator
        // Note: This requires the service to be set by a plugin during initialization
        if (!creditServiceRef) {
            throw new UserInputError('Credit service not initialized. Please ensure credit plugin is loaded.');
        }

        // Get credit summary
        const summary = await creditServiceRef.getCreditSummary(ctx, customerId);

        if (!summary.isCreditApproved) {
            throw new UserInputError('Customer is not approved for credit purchases.');
        }

        if (summary.availableCredit < order.total) {
            throw new UserInputError('Customer credit limit exceeded.');
        }

        // Apply credit charge
        await creditServiceRef.applyCreditCharge(ctx, customerId, order.total);

        return {
            amount: order.total,
            state: 'Authorized',
            transactionId: `CREDIT-${Date.now()}`,
            metadata: {
                paymentType: 'credit',
                customerId,
                creditLimit: summary.creditLimit,
                outstandingAmount: summary.outstandingAmount - order.total,
            },
        };
    },
    settlePayment: async (): Promise<SettlePaymentResult> => {
        // Credit payment is already authorized in createPayment
        // Settlement just confirms the authorization
        return { success: true };
    },
});

