/**
 * Action Categories
 *
 * Categorizes actions for separate tracking and rate limiting.
 * Each category has independent rate limits and tracking.
 */
export enum ActionCategory {
  AUTHENTICATION = 'authentication', // OTP, login verification
  CUSTOMER_COMMUNICATION = 'customer_communication', // Account events, credit notifications
  SYSTEM_NOTIFICATIONS = 'system_notifications', // ML, admin, order, stock alerts
}
