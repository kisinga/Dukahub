import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface NavItem {
    label: string;
    icon: string;
    route: string;
}

interface Company {
    id: string;
    name: string;
    logo: string;
}

@Component({
    selector: 'app-dashboard-layout',
    imports: [RouterOutlet, RouterLink, RouterLinkActive],
    templateUrl: './dashboard-layout.component.html',
    styleUrl: './dashboard-layout.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardLayoutComponent {
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

    // Computed unread notifications count
    protected readonly unreadCount = computed(() =>
        this.notifications.filter(n => n.unread).length
    );

    // Mock company data - TODO: Replace with actual data from backend
    protected readonly companies: Company[] = [
        {
            id: '1',
            name: 'Acme Pharmacy',
            logo: 'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'
        },
        {
            id: '2',
            name: 'MediStore Plus Downtown',
            logo: 'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'
        },
        {
            id: '3',
            name: 'HealthCare Hub & Wellness Center',
            logo: 'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'
        },
        {
            id: '4',
            name: 'Quick Meds Express',
            logo: 'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'
        },
        {
            id: '5',
            name: 'City Pharmacy Branch A',
            logo: 'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'
        }
    ];

    protected readonly selectedCompanyId = signal('1');

    protected readonly selectedCompany = computed(() =>
        this.companies.find(c => c.id === this.selectedCompanyId()) || this.companies[0]
    );

    // Truncate company name for display (max 20 characters)
    protected readonly displayCompanyName = computed(() => {
        const name = this.selectedCompany().name;
        return name.length > 20 ? name.substring(0, 20) + '...' : name;
    });

    // User data - TODO: Replace with actual data from auth service
    protected readonly currentUser = {
        name: 'Admin User',
        email: 'admin@dukahub.com',
        avatar: 'default_avatar.png'
    };

    closeDrawer(): void {
        // Close drawer by unchecking the checkbox (for mobile navigation)
        const checkbox = document.getElementById('dashboard-drawer') as HTMLInputElement;
        if (checkbox) {
            checkbox.checked = false;
        }
    }

    selectCompany(companyId: string): void {
        this.selectedCompanyId.set(companyId);
        // TODO: Implement company switching logic (reload data, etc.)
    }

    logout(): void {
        // TODO: Implement logout logic
        window.location.href = '/';
    }
}

