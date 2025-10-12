import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppInitService } from '../../core/services/app-init.service';
import { AuthService } from '../../core/services/auth.service';
import { CompanyService } from '../../core/services/company.service';

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
    private readonly appInitService = inject(AppInitService);

    protected readonly navItems: NavItem[] = [
        { label: 'Overview', icon: '📊', route: '/dashboard' },
        { label: 'Sell', icon: '💰', route: '/dashboard/sell' },
        { label: 'Products', icon: '📦', route: '/dashboard/products' },
        { label: 'Inventory', icon: '📋', route: '/dashboard/inventory' },
        { label: 'Reports', icon: '📈', route: '/dashboard/reports' },
        { label: 'Settings', icon: '⚙️', route: '/dashboard/settings' }
    ];

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

    // Computed values
    protected readonly unreadCount = computed(() =>
        this.notifications.filter(n => n.unread).length
    );

    protected readonly displayCompanyName = computed(() => {
        const company = this.activeCompany();
        if (!company) return 'Loading...';
        const name = company.code;
        return name.length > 20 ? name.substring(0, 20) + '...' : name;
    });

    protected readonly userAvatar = computed(() =>
        this.user()?.emailAddress ? 'default_avatar.png' : 'default_avatar.png'
    );

    constructor() {
        // Initialize company selection from storage
        // Companies are automatically populated from login response via AuthService
        this.companyService.initializeFromStorage();

        // Watch for active company changes and initialize dashboard
        effect(() => {
            const companyId = this.activeCompanyId();
            if (companyId) {
                console.log(`🔄 Active company changed: ${companyId}`);
                // Initialize dashboard data in background (non-blocking)
                this.appInitService.initializeDashboard(companyId);
            }
        });
    }

    ngOnInit(): void {
        // If company already active on init, trigger initialization
        const companyId = this.activeCompanyId();
        if (companyId) {
            this.appInitService.initializeDashboard(companyId);
        }
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
    }

    async logout(): Promise<void> {
        // Clear cached data before logout
        this.appInitService.clearCache();
        await this.authService.logout();
    }
}

