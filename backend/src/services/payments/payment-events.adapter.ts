import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBus, PaymentState, PaymentStateTransitionEvent, RequestContext } from '@vendure/core';
import { PostingService } from '../../ledger/posting.service';

@Injectable()
export class PaymentEventsAdapter implements OnModuleInit {
  private readonly logger = new Logger('PaymentEventsAdapter');
  constructor(private readonly eventBus: EventBus, private readonly postingService: PostingService) {}

  onModuleInit(): any {
    this.eventBus.ofType(PaymentStateTransitionEvent).subscribe(async (event) => {
      try {
        const ctx = event.ctx as RequestContext;
        const payment = event.payment;
        const order = event.order;
        const toState = event.toState as PaymentState;
        if (toState === 'Settled') {
          await this.postingService.post('Payment', String(payment.id), {
            channelId: ctx.channelId as any,
            entryDate: new Date().toISOString().slice(0, 10),
            memo: `Payment settled for order ${order.code}`,
            lines: [
              {
                accountCode: this.mapMethodToAccount(payment.method),
                debit: payment.amount,
                meta: { orderId: order.id, method: payment.method },
              },
              {
                accountCode: 'SALES',
                credit: payment.amount,
                meta: { orderId: order.id, method: payment.method },
              },
            ],
          });
        }
        // Refunds are represented by Refund entities in Vendure; handle via a dedicated adapter later.
      } catch (e) {
        this.logger.error(`Posting for payment event failed: ${(e as Error).message}`);
      }
    });
  }

  private mapMethodToAccount(methodCode: string): string {
    switch (methodCode) {
      case 'cash-payment':
        return 'CASH_ON_HAND';
      case 'mpesa-payment':
        return 'CLEARING_MPESA';
      case 'credit-payment':
        return 'CLEARING_CREDIT';
      default:
        return 'CLEARING_GENERIC';
    }
  }
}


