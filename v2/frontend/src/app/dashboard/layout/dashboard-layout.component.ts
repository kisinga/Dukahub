import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

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
    protected readonly drawerOpen = signal(false);
    protected readonly notificationsOpen = signal(false);
    protected readonly profileOpen = signal(false);

    protected readonly navItems: NavItem[] = [
        { label: 'Overview', icon: '📊', route: '/dashboard' },
        { label: 'Sell', icon: '💰', route: '/dashboard/sell' },
        { label: 'Products', icon: '📦', route: '/dashboard/products' },
        { label: 'Inventory', icon: '📋', route: '/dashboard/inventory' },
        { label: 'Reports', icon: '📈', route: '/dashboard/reports' },
        { label: 'Settings', icon: '⚙️', route: '/dashboard/settings' }
    ];

    protected readonly notifications = [
        { icon: 'ℹ️', text: 'Low stock alert: Panadol', time: '2h ago', type: 'warning' },
        { icon: '✅', text: 'Sale completed: KES 5,400', time: '4h ago', type: 'success' },
        { icon: '📦', text: '5 new products added', time: '1d ago', type: 'info' }
    ];

    toggleDrawer(): void {
        this.drawerOpen.update(v => !v);
    }

    closeDrawer(): void {
        this.drawerOpen.set(false);
    }

    toggleNotifications(): void {
        this.notificationsOpen.update(v => !v);
        if (this.notificationsOpen()) {
            this.profileOpen.set(false);
        }
    }

    toggleProfile(): void {
        this.profileOpen.update(v => !v);
        if (this.profileOpen()) {
            this.notificationsOpen.set(false);
        }
    }

    logout(): void {
        // TODO: Implement logout logic
        window.location.href = '/';
    }
}

