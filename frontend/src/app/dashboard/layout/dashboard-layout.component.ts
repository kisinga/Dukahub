import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppInitService } from '../../core/services/app-init.service';
import { AuthService } from '../../core/services/auth.service';
import { CompanyService } from '../../core/services/company.service';
import { NetworkService } from '../../core/services/network.service';
import { NotificationService } from '../../core/services/notification.service';
import { StockLocationService } from '../../core/services/stock-location.service';

interface NavItem {
    label: string;
    icon: string;
    route: string;
}

@Component({
    selector: 'app-dashboard-layout',
    imports: [RouterOutlet, RouterLink, RouterLinkActive],
    templateUrl: './dashboard-layout.component.html',
    styleUrl: './dashboard-layout.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardLayoutComponent implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly companyService = inject(CompanyService);
    private readonly stockLocationService = inject(StockLocationService);
    private readonly appInitService = inject(AppInitService);
    private readonly notificationService = inject(NotificationService);
    private readonly networkService = inject(NetworkService);
    private lastCompanyId: string | null = null;

    protected readonly navItems = computed(() => {
        const baseItems: NavItem[] = [
            { label: 'Overview', icon: '📊', route: '/dashboard' },
            { label: 'Sell', icon: '💰', route: '/dashboard/sell' },
            { label: 'Products', icon: '📦', route: '/dashboard/products' },
            { label: 'Customers', icon: '👥', route: '/dashboard/customers' },
            { label: 'Suppliers', icon: '🏢', route: '/dashboard/suppliers' },
            { label: 'Inventory', icon: '📋', route: '/dashboard/inventory' },
            { label: 'Reports', icon: '📈', route: '/dashboard/reports' },
        ];

        if (this.authService.hasCreditManagementPermission()) {
            baseItems.splice(4, 0, { label: 'Credit', icon: '💳', route: '/dashboard/credit' });
        }

        // Only add Settings if user has UpdateSettings permission
        if (this.authService.hasUpdateSettingsPermission()) {
            baseItems.push({ label: 'Settings', icon: '⚙️', route: '/dashboard/settings' });
        }

        return baseItems;
    });

    // Use notification service
    protected readonly notifications = this.notificationService.notifications;

    // Auth service signals
    protected readonly user = this.authService.user;
    protected readonly fullName = this.authService.fullName;

    // Company service signals
    protected readonly companies = this.companyService.companies;
    protected readonly activeCompanyId = this.companyService.activeCompanyId;
    protected readonly activeCompany = this.companyService.activeCompany;
    protected readonly companyDisplayName = this.companyService.companyDisplayName;
    protected readonly companyLogoAsset = this.companyService.companyLogoAsset;
    protected readonly companyLogoUrl = this.companyService.companyLogoUrl;

    // Use notification service
    protected readonly unreadCount = this.notificationService.unreadCount;

    // Network status
    protected readonly isOnline = this.networkService.isOnline;

    protected readonly userAvatar = computed(() =>
        this.user()?.emailAddress ? 'default_avatar.png' : 'default_avatar.png'
    );

    protected readonly logoUrl = computed(() => {
        // Use the new proxy-compatible logo URL directly
        return this.companyLogoUrl() || 'shop_icon.png';
    });

    constructor() {
        // Note: Company session is now restored in AuthService before channels are fetched
        // This ensures the selected company persists across page refreshes

        // Watch for active company changes and initialize dashboard
        effect(() => {
            const companyId = this.activeCompanyId();
            if (companyId && companyId !== this.lastCompanyId) {
                this.lastCompanyId = companyId;
                this.appInitService.initializeDashboard(companyId);
            }
        });
    }

    ngOnInit(): void {
        // Initialization is handled by the effect in constructor
        // No need for duplicate call here

        // Load notifications
        this.notificationService.loadNotifications();
        this.notificationService.loadUnreadCount();
    }

    closeDrawer(): void {
        const checkbox = document.getElementById('dashboard-drawer') as HTMLInputElement;
        if (checkbox) {
            checkbox.checked = false;
        }
    }

    selectCompany(companyId: string): void {
        this.companyService.activateCompany(companyId);
        // Note: effect() in constructor will trigger initialization
        // Also clear and refetch locations for new company
        this.stockLocationService.clearLocations();
        this.stockLocationService.fetchStockLocationsWithCashier();
    }

    async logout(): Promise<void> {
        // Clear cached data before logout
        this.appInitService.clearCache();
        await this.authService.logout();
    }

    // Notification handling methods
    async markNotificationAsRead(notificationId: string): Promise<void> {
        await this.notificationService.markAsRead(notificationId);
    }

    async markAllNotificationsAsRead(): Promise<void> {
        await this.notificationService.markAllAsRead();
    }

    getNotificationIcon(type: string): string {
        switch (type) {
            case 'ORDER':
                return '💰';
            case 'STOCK':
                return '⚠️';
            case 'ML_TRAINING':
                return '🤖';
            case 'PAYMENT':
                return '💳';
            default:
                return 'ℹ️';
        }
    }

    getNotificationTypeClass(type: string): string {
        switch (type) {
            case 'ORDER':
                return 'success';
            case 'STOCK':
                return 'warning';
            case 'ML_TRAINING':
                return 'info';
            case 'PAYMENT':
                return 'success';
            default:
                return 'info';
        }
    }

    formatNotificationTime(createdAt: string): string {
        const now = new Date();
        const notificationTime = new Date(createdAt);
        const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60));

        if (diffInMinutes < 1) {
            return 'Just now';
        } else if (diffInMinutes < 60) {
            return `${diffInMinutes} minutes ago`;
        } else if (diffInMinutes < 1440) {
            const hours = Math.floor(diffInMinutes / 60);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(diffInMinutes / 1440);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }
    }
}

