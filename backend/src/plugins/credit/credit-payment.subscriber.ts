import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBus, PaymentStateTransitionEvent } from '@vendure/core';

import { CreditService } from '../../services/credit/credit.service';

@Injectable()
export class CreditPaymentSubscriber implements OnModuleInit {
    constructor(
        private readonly eventBus: EventBus,
        private readonly creditService: CreditService,
    ) { }

    onModuleInit(): void {
        this.eventBus.ofType(PaymentStateTransitionEvent).subscribe((event) => {
            void this.handlePaymentTransition(event);
        });
    }

    private async handlePaymentTransition(event: PaymentStateTransitionEvent): Promise<void> {
        const { payment, order, ctx, toState } = event;
        const paymentType = payment.metadata?.paymentType;
        const customerId = order?.customer?.id;

        if (paymentType !== 'credit' || !customerId) {
            return;
        }

        if (toState === 'Cancelled' || toState === 'Declined' || toState === 'Error') {
            await this.creditService.releaseCreditCharge(ctx, customerId, payment.amount);
        }
    }
}

