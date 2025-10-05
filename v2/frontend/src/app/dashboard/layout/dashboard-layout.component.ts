import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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
export class DashboardLayoutComponent {
    private readonly authService = inject(AuthService);
    private readonly companyService = inject(CompanyService);

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
    protected readonly selectedCompanyId = this.companyService.selectedCompanyId;
    protected readonly selectedCompany = this.companyService.selectedCompany;

    // Computed values
    protected readonly unreadCount = computed(() =>
        this.notifications.filter(n => n.unread).length
    );

    protected readonly displayCompanyName = computed(() => {
        const company = this.selectedCompany();
        if (!company) return 'Loading...';
        const name = company.name;
        return name.length > 20 ? name.substring(0, 20) + '...' : name;
    });

    protected readonly userAvatar = computed(() =>
        this.user()?.emailAddress ? 'default_avatar.png' : 'default_avatar.png'
    );

    constructor() {
        // Initialize company selection from storage
        this.companyService.initializeFromStorage();

        // Fetch companies when authenticated
        effect(() => {
            if (this.authService.isAuthenticated()) {
                this.companyService.fetchCompanies();
            }
        });
    }

    closeDrawer(): void {
        const checkbox = document.getElementById('dashboard-drawer') as HTMLInputElement;
        if (checkbox) {
            checkbox.checked = false;
        }
    }

    selectCompany(companyId: string): void {
        this.companyService.selectCompany(companyId);
    }

    async logout(): Promise<void> {
        await this.authService.logout();
    }
}

