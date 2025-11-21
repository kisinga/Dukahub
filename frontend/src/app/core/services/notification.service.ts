import { Injectable, inject, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { environment } from '../../../environments/environment';
import {
  GetUnreadCountDocument,
  GetUserNotificationsDocument,
  MarkAllAsReadDocument,
  MarkNotificationAsReadDocument,
  NotificationType,
  SubscribeToPushDocument,
  UnsubscribeToPushDocument,
} from '../graphql/generated/graphql';
import type { Notification } from '../graphql/notification.types';
import { ApolloService } from './apollo.service';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly apolloService = inject(ApolloService);
  private readonly swPush = inject(SwPush);
  private readonly toastService = inject(ToastService);

  // State signals
  private readonly notificationsSignal = signal<Notification[]>([]);
  private readonly unreadCountSignal = signal<number>(0);
  private readonly isPushEnabledSignal = signal<boolean>(false);
  private readonly isLoadingSignal = signal<boolean>(false);

  // Public computed signals
  readonly notifications = this.notificationsSignal.asReadonly();
  readonly unreadCount = this.unreadCountSignal.asReadonly();
  readonly isPushEnabled = this.isPushEnabledSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();

  // Permission status signal
  private readonly permissionSignal = signal<NotificationPermission>('default');
  readonly permission = this.permissionSignal.asReadonly();

  // Polling interval for fallback
  private pollingInterval?: number;

  private readonly HAS_PROMPTED_KEY = 'notification_permission_prompted';

  constructor() {
    this.initializeNotifications();
  }

  private async initializeNotifications(): Promise<void> {
    try {
      // Check if push notifications are supported
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        await this.checkPermissionStatus();
        await this.checkPushPermission();

        // Only setup push subscription if service worker is enabled
        if (this.swPush.isEnabled) {
          await this.setupPushSubscription();
        } else if (this.isDevMode()) {
          console.log(
            'Service worker not enabled in development mode - push notifications will use polling fallback',
          );
        }

        // Auto-prompt if not prompted before
        this.autoPromptPermission();
      }

      // Load initial notifications
      await this.loadNotifications();
      await this.loadUnreadCount();

      // Start polling as fallback (every 30 seconds)
      this.startPolling();
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  private async autoPromptPermission(): Promise<void> {
    if (!this.hasPrompted()) {
      // We can only request permission on user gesture or page load if browser allows.
      // But modern browsers block auto-request on load.
      // Instead of forcing requestPermission(), let's check if we SHOULD prompt via UI or logic.
      // Actually, best practice is to NOT auto-prompt with the native dialog immediately,
      // but we can check permission status.
      // If 'default', we can decide to show our own UI prompt or wait.
      // The requirement says "Automatically prompt for permission on first dashboard load".
      // Let's try it, but catch errors if blocked.

      // Note: Many browsers block this unless handling a user event.
      // If blocked, we just mark as prompted so we don't retry endlessly.

      // However, for better UX, we should probably just let the user know.
      // But adhering to the plan: "automatically prompt for permission on first dashboard load"

      // Since we can't guarantee it works without gesture, maybe we just call requestPushPermission()
      // and let the browser decide.

      // We'll mark as prompted to avoid spamming on every reload.
      this.setPrompted();

      if (Notification.permission === 'default') {
        // Some browsers allow this on load, others don't.
        // We'll try.
        await this.requestPushPermission();
      }
    }
  }

  async requestPushPermission(): Promise<boolean> {
    try {
      const permission = await Notification.requestPermission();
      this.permissionSignal.set(permission);
      const granted = permission === 'granted';
      this.isPushEnabledSignal.set(granted);

      if (granted) {
        await this.subscribeToPush();
      }

      return granted;
    } catch (error) {
      console.error('Failed to request push permission:', error);
      return false;
    }
  }

  private async checkPushPermission(): Promise<void> {
    if ('Notification' in window) {
      this.permissionSignal.set(Notification.permission);
      if (Notification.permission === 'granted') {
        this.isPushEnabledSignal.set(true);
        // Ensure we are subscribed if granted
        if (this.swPush.isEnabled) {
          // We don't await here to not block init
          this.ensureSubscription();
        }
      } else {
        this.isPushEnabledSignal.set(false);
      }
    }
  }

  private async ensureSubscription(): Promise<void> {
    // Check if we have an active subscription in SW
    try {
      const sub = await this.swPush.subscription.toPromise();
      if (!sub) {
        // Permission granted but no subscription, try to subscribe
        await this.subscribeToPush();
      }
    } catch (e) {
      console.error('Error checking subscription', e);
    }
  }

  private async setupPushSubscription(): Promise<void> {
    try {
      if (this.swPush.isEnabled) {
        this.swPush.messages.subscribe((message) => {
          this.handlePushMessage(message);
        });

        this.swPush.notificationClicks.subscribe((event) => {
          this.handleNotificationClick(event);
        });
      }
    } catch (error) {
      console.error('Failed to setup push subscription:', error);
    }
  }

  private handlePushMessage(message: any): void {
    // Handle incoming push message
    console.log('Received push message:', message);

    // Refresh notifications
    this.loadNotifications();
    this.loadUnreadCount();

    // Show toast for foreground notification if payload has title/body
    if (message?.notification?.title) {
      this.toastService.show(message.notification.title, message.notification.body, 'info', 5000);
    }
  }

  private handleNotificationClick(event: any): void {
    // Handle notification click
    console.log('Notification clicked:', event);

    // Focus the app window
    window.focus();

    // Navigate if URL present
    if (event.notification.data.url) {
      // We'd need Router here, but window.location works for now or assume root
      // window.location.href = event.notification.data.url;
    }
  }

  async subscribeToPush(): Promise<boolean> {
    try {
      if (!this.swPush.isEnabled) {
        console.warn('Service worker not enabled');
        if (this.isDevMode()) {
          // Don't show error in dev mode if not supported, just warn
          console.log('Service worker not available in development mode.');
        }
        return false;
      }

      // Check current permission status
      const permission = await this.getNotificationPermission();

      if (permission === 'denied') {
        this.toastService.show(
          'Push Notifications',
          'Notifications are blocked. Please enable them in your browser settings.',
          'error',
          5000,
        );
        return false;
      }

      // Request subscription from SW
      const subscription = await this.swPush.requestSubscription({
        serverPublicKey: environment.vapidPublicKey,
      });

      console.log('Push subscription obtained from service worker:', subscription);

      // Send subscription to backend
      const client = this.apolloService.getClient();

      // Convert PushSubscription to JSON format
      // PushSubscription has toJSON() method that returns the standard format
      let subscriptionJSON: any;
      try {
        subscriptionJSON = subscription.toJSON();
      } catch (e) {
        // Fallback: manually extract if toJSON() fails
        subscriptionJSON = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
            auth: this.arrayBufferToBase64(subscription.getKey('auth')),
          },
        };
      }

      console.log('Subscription JSON:', subscriptionJSON);

      // Ensure endpoint is defined and a string (JSON value can be null/undefined but GraphQL expects String!)
      if (!subscriptionJSON.endpoint) {
        throw new Error('Invalid subscription: endpoint is missing');
      }

      if (!subscriptionJSON.keys || !subscriptionJSON.keys.p256dh || !subscriptionJSON.keys.auth) {
        throw new Error('Invalid subscription: keys are missing or incomplete');
      }

      const input = {
        endpoint: subscriptionJSON.endpoint,
        keys: subscriptionJSON.keys,
      };

      console.log('Sending subscription to backend:', input);

      const result = await client.mutate({
        mutation: SubscribeToPushDocument,
        variables: {
          subscription: input,
        },
      });

      // Check for GraphQL errors
      if (result.errors && result.errors.length > 0) {
        const errorMessage = result.errors.map((e) => e.message).join(', ');
        console.error('GraphQL errors:', result.errors);
        throw new Error(`GraphQL error: ${errorMessage}`);
      }

      if (result.data?.subscribeToPush) {
        console.log('Push subscription created and synced to backend');
        this.isPushEnabledSignal.set(true);
        this.toastService.show(
          'Push Notifications',
          'Successfully subscribed to push notifications',
          'success',
          5000,
        );
        return true;
      } else {
        throw new Error('Backend rejected subscription');
      }
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);

      // Log full error details for debugging
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }

      // Check for specific error types
      if (error instanceof Error) {
        if (error.message.includes('user dismissed')) {
          this.toastService.show(
            'Push Notifications',
            'Permission request was dismissed.',
            'info',
            5000,
          );
          return false;
        }

        if (error.message.includes('GraphQL error')) {
          this.toastService.show(
            'Push Notifications',
            `Failed to enable: ${error.message}`,
            'error',
            5000,
          );
          return false;
        }
      }

      this.toastService.show(
        'Push Notifications',
        `Failed to enable push notifications: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the console for details.`,
        'error',
        5000,
      );

      return false;
    }
  }

  async unsubscribeToPush(): Promise<boolean> {
    try {
      // Unsubscribe from SW
      if (this.swPush.isEnabled) {
        await this.swPush.unsubscribe();
      }

      // Notify backend
      const client = this.apolloService.getClient();
      await client.mutate({
        mutation: UnsubscribeToPushDocument,
      });

      this.isPushEnabledSignal.set(false);

      this.toastService.show(
        'Push Notifications',
        'Successfully unsubscribed from push notifications',
        'info',
        3000,
      );

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  async loadNotifications(
    options: { skip?: number; take?: number; type?: NotificationType } = {},
  ): Promise<void> {
    try {
      this.isLoadingSignal.set(true);

      const client = this.apolloService.getClient();
      const result = await client.query({
        query: GetUserNotificationsDocument,
        variables: { options },
        fetchPolicy: 'network-only', // Ensure fresh data
      });

      if (result?.data?.getUserNotifications?.items) {
        this.notificationsSignal.set(result.data.getUserNotifications.items);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      // No mock fallback in production/dev anymore, reflect real state
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  async loadUnreadCount(): Promise<void> {
    try {
      const client = this.apolloService.getClient();
      const result = await client.query({
        query: GetUnreadCountDocument,
        fetchPolicy: 'network-only',
      });

      if (typeof result?.data?.getUnreadCount === 'number') {
        this.unreadCountSignal.set(result.data.getUnreadCount);
      }
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  }

  private isDevMode(): boolean {
    return !environment.production;
  }

  private async getNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  private async checkPermissionStatus(): Promise<void> {
    const permission = await this.getNotificationPermission();
    this.permissionSignal.set(permission);

    // Update push enabled status based on permission
    if (permission === 'granted') {
      this.isPushEnabledSignal.set(true);
    } else {
      this.isPushEnabledSignal.set(false);
    }
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const client = this.apolloService.getClient();
      const result = await client.mutate({
        mutation: MarkNotificationAsReadDocument,
        variables: { id: notificationId },
      });

      if (result.data?.markNotificationAsRead) {
        // Update local state
        this.notificationsSignal.update((notifications) =>
          notifications.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
        );
        this.loadUnreadCount(); // Sync count
        this.toastService.show('Notification', 'Marked as read', 'success', 3000);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      this.toastService.show('Error', 'Failed to mark as read', 'error', 3000);
      return false;
    }
  }

  async markAllAsRead(): Promise<number> {
    try {
      const client = this.apolloService.getClient();
      const result = await client.mutate({
        mutation: MarkAllAsReadDocument,
      });

      const markedCount = result.data?.markAllAsRead || 0;

      if (markedCount > 0) {
        // Update local state
        this.notificationsSignal.update((notifications) =>
          notifications.map((n) => ({ ...n, read: true })),
        );
        this.unreadCountSignal.set(0);

        this.toastService.show(
          'Notifications',
          `Marked ${markedCount} notifications as read`,
          'success',
          3000,
        );
      } else {
        this.toastService.show('Notifications', 'No unread notifications', 'info', 3000);
      }

      return markedCount;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      this.toastService.show('Error', 'Failed to mark all as read', 'error', 3000);
      return 0;
    }
  }

  private startPolling(): void {
    // Poll every 30 seconds as fallback
    this.pollingInterval = window.setInterval(() => {
      this.loadNotifications();
      this.loadUnreadCount();
    }, 30000);
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  // Helper for prompt persistence
  private hasPrompted(): boolean {
    return localStorage.getItem(this.HAS_PROMPTED_KEY) === 'true';
  }

  private setPrompted(): void {
    localStorage.setItem(this.HAS_PROMPTED_KEY, 'true');
  }

  // Helper to convert ArrayBuffer to base64 (fallback if toJSON() doesn't work)
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
