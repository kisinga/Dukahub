import { CreatePaymentResult, LanguageCode, PaymentMethodHandler, SettlePaymentResult } from '@vendure/core';

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
                ...metadata
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
                phoneNumber: metadata.phoneNumber || null, // Capture for future API integration
                ...metadata
            }
        };
    },

    settlePayment: async (): Promise<SettlePaymentResult> => {
        // Already settled (future: handle async confirmation)
        return { success: true };
    }
});

