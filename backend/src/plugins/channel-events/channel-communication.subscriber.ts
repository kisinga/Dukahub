import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBus } from '@vendure/core';
import { ChannelCommunicationService } from './channel-communication.service';

/**
 * Channel Communication Subscriber
 * 
 * Subscribes to events and triggers customer communication notifications.
 * This subscriber listens for credit-related events and triggers appropriate notifications.
 */
@Injectable()
export class ChannelCommunicationSubscriber implements OnModuleInit {
    constructor(
        private readonly eventBus: EventBus,
        private readonly communicationService: ChannelCommunicationService,
    ) { }

    onModuleInit(): void {
        // Note: For now, we'll trigger notifications directly from services
        // Future: Can subscribe to custom events if we create them
        // Example:
        // this.eventBus.ofType(CustomerCreditApprovedEvent).subscribe(async (event) => {
        //     await this.communicationService.sendAccountApprovedNotification(
        //         event.ctx,
        //         event.customerId,
        //         event.creditLimit,
        //         event.creditDuration
        //     );
        // });
    }
}

