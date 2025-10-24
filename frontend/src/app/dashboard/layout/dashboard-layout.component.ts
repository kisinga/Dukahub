import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppInitService } from '../../core/services/app-init.service';
import { AuthService } from '../../core/services/auth.service';
import { CompanyService } from '../../core/services/company.service';
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

        // Only add Settings if user has UpdateSettings permission
        if (this.authService.hasUpdateSettingsPermission()) {
            baseItems.push({ label: 'Settings', icon: '⚙️', route: '/dashboard/settings' });
        }

        return baseItems;
    });

    protected readonly notifications = [
        {
            icon: '⚠️',
            text: 'Low stock alert: Panadol Extra only 5 units remaining',
            time: '2 minutes ago',
            type: 'warning',
            unread: true
        },
        {
            icon: '⚠️',
            text: 'Critical: Aspirin out of stock',
            time: '15 minutes ago',
            type: 'warning',
            unread: true
        },
        {
            icon: '✅',
            text: 'Sale completed: KES 5,400 (Receipt #1247)',
            time: '1 hour ago',
            type: 'success',
            unread: false
        },
        {
            icon: '💰',
            text: 'Payment received: KES 12,000 from wholesale order',
            time: '2 hours ago',
            type: 'success',
            unread: false
        },
        {
            icon: '📦',
            text: '15 new products added to inventory',
            time: '5 hours ago',
            type: 'info',
            unread: false
        },
        {
            icon: 'ℹ️',
            text: 'Monthly report is ready for review',
            time: '1 day ago',
            type: 'info',
            unread: false
        }
    ];

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

    // Computed values
    protected readonly unreadCount = computed(() =>
        this.notifications.filter(n => n.unread).length
    );

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
}

