import { Injectable } from '@nestjs/common';
import { LanguageCode, PaymentMethod, PaymentMethodService, RequestContext } from '@vendure/core';
import { ChannelAssignmentService } from './channel-assignment.service';
import { RegistrationAuditorService } from './registration-auditor.service';
import { RegistrationErrorService } from './registration-error.service';

/**
 * Payment Provisioner Service
 * 
 * Handles payment method creation and channel assignment.
 * Creates both Cash and M-Pesa payment methods.
 * LOB: Payment = Payment processing capabilities for the channel.
 */
@Injectable()
export class PaymentProvisionerService {
    constructor(
        private readonly paymentMethodService: PaymentMethodService,
        private readonly channelAssignment: ChannelAssignmentService,
        private readonly auditor: RegistrationAuditorService,
        private readonly errorService: RegistrationErrorService,
    ) { }

    /**
     * Create all required payment methods and assign to channel
     * Creates: Cash Payment and M-Pesa Payment
     */
    async createAndAssignPaymentMethods(
        ctx: RequestContext,
        channelId: string,
        companyCode: string
    ): Promise<PaymentMethod[]> {
        try {
            const paymentMethods: PaymentMethod[] = [];

            // Create Cash Payment Method
            const cashPayment = await this.createPaymentMethod(
                ctx,
                channelId,
                'cash-payment',
                'Cash Payment',
                'Cash Payment - Immediate settlement'
            );
            await this.channelAssignment.assignPaymentMethodToChannel(ctx, cashPayment.id, channelId as any);
            await this.auditor.logEntityCreated(ctx, 'PaymentMethod', cashPayment.id.toString(), cashPayment, {
                handler: 'cash-payment',
                channelId,
                companyCode,
            });
            paymentMethods.push(cashPayment);

            // Create M-Pesa Payment Method
            const mpesaPayment = await this.createPaymentMethod(
                ctx,
                channelId,
                'mpesa-payment',
                'M-Pesa Payment',
                'M-Pesa Payment - Mobile money'
            );
            await this.channelAssignment.assignPaymentMethodToChannel(ctx, mpesaPayment.id, channelId as any);
            await this.auditor.logEntityCreated(ctx, 'PaymentMethod', mpesaPayment.id.toString(), mpesaPayment, {
                handler: 'mpesa-payment',
                channelId,
                companyCode,
            });
            paymentMethods.push(mpesaPayment);

            // Verify both payment methods are assigned
            await this.channelAssignment.verifyPaymentMethodCount(ctx, channelId as any, 2);

            return paymentMethods;
        } catch (error: any) {
            this.errorService.logError('PaymentProvisioner', error, 'Payment method creation');
            throw this.errorService.wrapError(error, 'PAYMENT_METHOD_CREATE_FAILED');
        }
    }

    /**
     * Create a single payment method
     */
    private async createPaymentMethod(
        ctx: RequestContext,
        channelId: string,
        handlerCode: string,
        name: string,
        description: string
    ): Promise<PaymentMethod> {
        const paymentMethodResult = await this.paymentMethodService.create(ctx, {
            code: `${handlerCode}-${channelId}`,
            enabled: true,
            handler: {
                code: handlerCode,
                arguments: [],
            },
            translations: [
                {
                    languageCode: LanguageCode.en,
                    name,
                    description,
                },
            ],
            customFields: {
                isActive: true,
            },
        });

        if ('errorCode' in paymentMethodResult) {
            const error = paymentMethodResult as any;
            const errorMsg = error.message || 'Unknown error';

            // Check if error is related to missing handler
            if (errorMsg.toLowerCase().includes('handler') || errorMsg.toLowerCase().includes('not found')) {
                throw this.errorService.createError(
                    'PAYMENT_HANDLER_MISSING',
                    `Payment handler '${handlerCode}' is not configured. ` +
                    `Please ensure ${handlerCode}Handler is registered in paymentOptions.paymentMethodHandlers.`
                );
            }

            throw this.errorService.createError(
                'PAYMENT_METHOD_CREATE_FAILED',
                `Failed to create ${name} payment method: ${errorMsg}`
            );
        }

        return paymentMethodResult as PaymentMethod;
    }
}

