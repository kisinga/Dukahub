import { Injectable, Logger } from '@nestjs/common';
import { RequestContext } from '@vendure/core';
import { Customer, CustomerService } from '@vendure/core';
import { ChannelSmsService } from '../channel-sms.service';
import { ActionCategory } from '../types/action-category.enum';
import { ChannelActionType } from '../types/action-type.enum';
import { ChannelEventType } from '../types/event-type.enum';
import { ActionConfig, ActionResult, ChannelEvent } from '../types/channel-event.interface';
import { IChannelActionHandler } from './action-handler.interface';

/**
 * SMS Action Handler
 *
 * Sends SMS notifications using the ChannelSmsService.
 */
@Injectable()
export class SmsActionHandler implements IChannelActionHandler {
  type = ChannelActionType.SMS;
  category = ActionCategory.CUSTOMER_COMMUNICATION; // Can be any category
  private readonly logger = new Logger('SmsActionHandler');

  constructor(
    private readonly channelSmsService: ChannelSmsService,
    private readonly customerService: CustomerService
  ) {}

  async execute(
    ctx: RequestContext,
    event: ChannelEvent,
    config: ActionConfig
  ): Promise<ActionResult> {
    try {
      // Get phone number from customer or event data
      let phoneNumber: string | undefined;

      if (event.targetCustomerId) {
        const customer = await this.customerService.findOne(ctx, event.targetCustomerId);
        if (customer) {
          phoneNumber = customer.phoneNumber || undefined;
        }
      }

      // Fallback to event data
      if (!phoneNumber && event.data?.phoneNumber) {
        phoneNumber = event.data.phoneNumber;
      }

      if (!phoneNumber) {
        return {
          success: false,
          actionType: this.type,
          error: 'No phone number available for SMS',
        };
      }

      const message = this.getMessageForEvent(event);

      const result = await this.channelSmsService.sendSms(
        ctx,
        phoneNumber,
        message,
        event.type as ChannelEventType,
        event.channelId
      );

      return {
        success: result.success,
        actionType: this.type,
        error: result.error,
        metadata: {
          messageId: result.messageId,
          phoneNumber,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to send SMS for event ${event.type}: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
      return {
        success: false,
        actionType: this.type,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  canHandle(event: ChannelEvent): boolean {
    // Can handle if we have a customer ID or phone number in data
    return !!(event.targetCustomerId || event.data?.phoneNumber);
  }

  private getMessageForEvent(event: ChannelEvent): string {
    const messageMap: Record<string, (data: any) => string> = {
      customer_created: () => 'Welcome! Your account has been created.',
      customer_credit_approved: data =>
        `Your credit account has been approved. Credit limit: ${data.creditLimit || 'N/A'}`,
      customer_balance_changed: data =>
        `Your outstanding balance has changed to: ${data.outstandingAmount || 'N/A'}`,
      customer_repayment_deadline: data =>
        `Reminder: Your repayment deadline is approaching. Outstanding: ${data.outstandingAmount || 'N/A'}`,
      order_payment_settled: data => `Order #${data.orderCode || 'N/A'} payment has been settled`,
      order_fulfilled: data => `Order #${data.orderCode || 'N/A'} has been fulfilled`,
      order_cancelled: data => `Order #${data.orderCode || 'N/A'} has been cancelled`,
    };

    const messageFn = messageMap[event.type];
    if (messageFn) {
      return messageFn(event.data || {});
    }

    return `Notification: ${event.type}`;
  }
}
