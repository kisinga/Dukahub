/**
 * Channel Action Types
 * 
 * Defines all actions that can be taken when an event occurs.
 */
export enum ChannelActionType {
    // Communication Actions
    SMS = 'sms',
    EMAIL = 'email',
    
    // Notification Actions
    PUSH_NOTIFICATION = 'push_notification',
    IN_APP_NOTIFICATION = 'in_app_notification',
    
    // Future: Webhook, Slack, etc.
    // WEBHOOK = 'webhook',
    // SLACK = 'slack',
}

