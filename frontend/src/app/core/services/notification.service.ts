import { Injectable, inject, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { environment } from '../../../environments/environment';
import { GetUnreadCountDocument, GetUserNotificationsDocument, NotificationType } from '../graphql/generated/graphql';
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

    // Permission status signal
    private readonly permissionSignal = signal<NotificationPermission>('default');
    readonly permission = this.permissionSignal.asReadonly();

    // Polling interval for fallback
    private pollingInterval?: number;

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
                    console.log('Service worker not enabled in development mode - push notifications will use polling fallback');
                }
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
                if (this.isDevMode()) {
                    this.toastService.show('Push Notifications', 'Service worker not available in development mode. Push notifications will work in production.', 'info', 5000);
                } else {
                    this.toastService.show('Push Notifications', 'Service worker not available. Please refresh the page.', 'warning', 5000);
                }
                return false;
            }

            // Check current permission status
            const permission = await this.getNotificationPermission();

            if (permission === 'denied') {
                this.toastService.show('Push Notifications', 'Notifications are blocked. Please enable them in your browser settings.', 'error', 5000);
                return false;
            }

            if (permission === 'granted') {
                // Already have permission, just create subscription
                return await this.createPushSubscription();
            }

            // Permission is 'default' - request it
            const subscription = await this.swPush.requestSubscription({
                serverPublicKey: 'BG8TDv8Aka5nR1E3aZ8m5sAkdt639rPGSszRG-l1_KJZbRnUpDveXswRoxp_3zqdLVCSRatg1wk_8i5zHUpUbL0', // VAPID public key
            });

            // Mock success for now - replace with actual GraphQL call when backend is ready
            console.log('Push subscription created:', subscription);
            this.isPushEnabledSignal.set(true);

            // Show toast notification
            this.toastService.show('Push Notifications', 'Successfully subscribed to push notifications', 'success', 5000);

            return true;
        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);

            if (error instanceof Error && error.message.includes('user dismissed')) {
                this.toastService.show('Push Notifications', 'Permission request was dismissed. You can enable notifications later in settings.', 'info', 5000);
            } else {
                this.toastService.show('Push Notifications', 'Failed to enable push notifications. Please try again.', 'error', 5000);
            }

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

    async loadNotifications(options: { skip?: number; take?: number; type?: NotificationType } = {}): Promise<void> {
        try {
            this.isLoadingSignal.set(true);

            // In development, try to use real GraphQL, fallback to mock data
            if (this.isDevMode()) {
                try {
                    // Try to fetch from real backend
                    const client = this.apolloService.getClient();
                    const result = await client.query({
                        query: GetUserNotificationsDocument,
                        variables: { options }
                    });

                    if (result?.data?.getUserNotifications?.items) {
                        this.notificationsSignal.set(result.data.getUserNotifications.items);
                        return;
                    }
                } catch (error) {
                    console.log('Backend not available, using mock data:', error);
                }
            }

            // Mock data fallback
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
            // In development, try to use real GraphQL, fallback to mock data
            if (this.isDevMode()) {
                try {
                    const client = this.apolloService.getClient();
                    const result = await client.query({
                        query: GetUnreadCountDocument
                    });

                    if (typeof result?.data?.getUnreadCount === 'number') {
                        this.unreadCountSignal.set(result.data.getUnreadCount);
                        return;
                    }
                } catch (error) {
                    console.log('Backend not available for unread count, using mock data:', error);
                }
            }

            // Mock data fallback
            const notifications = this.notificationsSignal();
            const unreadCount = notifications.filter(n => !n.read).length;
            this.unreadCountSignal.set(unreadCount);
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

    private async createPushSubscription(): Promise<boolean> {
        try {
            const subscription = await this.swPush.requestSubscription({
                serverPublicKey: 'BG8TDv8Aka5nR1E3aZ8m5sAkdt639rPGSszRG-l1_KJZbRnUpDveXswRoxp_3zqdLVCSRatg1wk_8i5zHUpUbL0',
            });

            console.log('Push subscription created:', subscription);
            this.isPushEnabledSignal.set(true);
            this.toastService.show('Push Notifications', 'Successfully subscribed to push notifications', 'success', 5000);

            return true;
        } catch (error) {
            console.error('Failed to create push subscription:', error);
            return false;
        }
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
