import { Injectable, inject, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import type {
    Notification
} from '../graphql/notification.types';
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

    // Polling interval for fallback
    private pollingInterval?: number;

    constructor() {
        this.initializeNotifications();
    }

    private async initializeNotifications(): Promise<void> {
        try {
            // Check if push notifications are supported
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                await this.checkPushPermission();
                await this.setupPushSubscription();
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

    async requestPushPermission(): Promise<boolean> {
        try {
            const permission = await Notification.requestPermission();
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
        if (Notification.permission === 'granted') {
            this.isPushEnabledSignal.set(true);
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
    }

    private handleNotificationClick(event: any): void {
        // Handle notification click
        console.log('Notification clicked:', event);

        // Focus the app window
        window.focus();
    }

    async subscribeToPush(): Promise<boolean> {
        try {
            if (!this.swPush.isEnabled) {
                console.warn('Service worker not enabled');
                return false;
            }

            const subscription = await this.swPush.requestSubscription({
                serverPublicKey: 'BF0sBtWcGxHBOWR1WY5m4YS3HJ2NQpY1nS1LU12yWV-mxMxey_A96hrNgM6G0gLQEb6jm7ZtFVgLG5F_ME_zg8o', // VAPID public key
            });

            // Mock success for now - replace with actual GraphQL call when backend is ready
            console.log('Push subscription created:', subscription);
            this.isPushEnabledSignal.set(true);

            // Show toast notification
            this.toastService.show('Push Notifications', 'Successfully subscribed to push notifications', 'success', 5000);

            return true;
        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
            return false;
        }
    }

    async unsubscribeToPush(): Promise<boolean> {
        try {
            // Mock success for now - replace with actual GraphQL call when backend is ready
            this.isPushEnabledSignal.set(false);

            // Show toast notification
            this.toastService.show('Push Notifications', 'Successfully unsubscribed from push notifications', 'info', 3000);

            return true;
        } catch (error) {
            console.error('Failed to unsubscribe from push notifications:', error);
            return false;
        }
    }

    async loadNotifications(options: { skip?: number; take?: number; type?: string } = {}): Promise<void> {
        try {
            this.isLoadingSignal.set(true);

            // Mock data for now - replace with actual GraphQL call when backend is ready
            const mockNotifications: Notification[] = [
                {
                    id: '1',
                    userId: 'user1',
                    channelId: 'channel1',
                    type: 'ORDER',
                    title: 'New Order',
                    message: 'Order #12345 has been placed',
                    data: { orderId: '12345' },
                    read: false,
                    createdAt: new Date().toISOString(),
                },
                {
                    id: '2',
                    userId: 'user1',
                    channelId: 'channel1',
                    type: 'STOCK',
                    title: 'Low Stock Alert',
                    message: 'Product "Sample Product" is running low (5 remaining)',
                    data: { productId: 'prod1', stockOnHand: 5 },
                    read: false,
                    createdAt: new Date(Date.now() - 60000).toISOString(),
                },
            ];

            this.notificationsSignal.set(mockNotifications);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            this.isLoadingSignal.set(false);
        }
    }

    async loadUnreadCount(): Promise<void> {
        try {
            // Mock data for now - replace with actual GraphQL call when backend is ready
            const notifications = this.notificationsSignal();
            const unreadCount = notifications.filter(n => !n.read).length;
            this.unreadCountSignal.set(unreadCount);
        } catch (error) {
            console.error('Failed to load unread count:', error);
        }
    }

    async markAsRead(notificationId: string): Promise<boolean> {
        try {
            // Update local state
            this.notificationsSignal.update(notifications =>
                notifications.map(n => n.id === notificationId ? { ...n, read: true } : n)
            );
            this.loadUnreadCount();

            // Show toast notification
            this.toastService.show('Notification', 'Marked as read', 'success', 3000);

            return true;
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            return false;
        }
    }

    async markAllAsRead(): Promise<number> {
        try {
            const notifications = this.notificationsSignal();
            const unreadCount = notifications.filter(n => !n.read).length;

            if (unreadCount > 0) {
                // Update local state
                this.notificationsSignal.update(notifications =>
                    notifications.map(n => ({ ...n, read: true }))
                );
                this.unreadCountSignal.set(0);

                // Show toast notification
                this.toastService.show('Notifications', `Marked ${unreadCount} notifications as read`, 'success', 3000);
            }

            return unreadCount;
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
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
}
