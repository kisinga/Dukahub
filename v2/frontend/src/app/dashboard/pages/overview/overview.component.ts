import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DashboardService, PeriodStats } from '../../../core/services/dashboard.service';

interface CategoryStat {
    period: string;
    amount: string;
}

interface AccountDetail {
    label: string;
    value: string;
    icon: string;
}

interface CategoryData {
    name: string;
    type: 'purchases' | 'sales' | 'expenses';
    color: string;
    lightColor: string;
    stats: CategoryStat[];
    accounts: AccountDetail[];
}

interface RecentActivity {
    id: string;
    type: string;
    description: string;
    amount: string;
    time: string;
}

/**
 * Dashboard Overview Component
 * 
 * Displays key business metrics: Sales, Purchases, Expenses
 * Shows real-time data from Vendure backend via DashboardService
 * 
 * Features:
 * - Real-time sales data from orders
 * - Period breakdowns (Today/Week/Month)
 * - Recent activity feed
 * - Product and user statistics
 */
@Component({
    selector: 'app-overview',
    imports: [CommonModule],
    templateUrl: './overview.component.html',
    styleUrl: './overview.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OverviewComponent implements OnInit {
    private readonly dashboardService = inject(DashboardService);

    protected readonly expandedCategory = signal<string | null>(null);
    protected readonly showRecentActivity = signal(false);
    protected readonly showQuickActions = signal(false);

    // Reactive data from service
    protected readonly isLoading = this.dashboardService.isLoading;
    protected readonly error = this.dashboardService.error;

    // Computed categories from real data
    protected readonly categories = computed(() => {
        const stats = this.dashboardService.stats();
        if (!stats) {
            return this.getDefaultCategories();
        }

        return [
            this.createCategoryData('Purchases', 'purchases', '#4361ee', stats.purchases),
            this.createCategoryData('Sales', 'sales', '#36b37e', stats.sales),
            this.createCategoryData('Expenses', 'expenses', '#ff5c75', stats.expenses),
        ];
    });

    // Recent activity from service
    protected readonly recentActivity = computed(() => {
        return this.dashboardService.recentActivity() || [];
    });

    // Secondary stats computed from service data
    protected readonly productCount = computed(() => {
        return this.dashboardService.stats()?.productCount || 0;
    });

    protected readonly activeUsers = computed(() => {
        return this.dashboardService.stats()?.activeUsers || 0;
    });

    protected readonly averageSale = computed(() => {
        const avg = this.dashboardService.stats()?.averageSale || 0;
        return this.formatCurrency(avg);
    });

    protected readonly profitMargin = computed(() => {
        return this.dashboardService.stats()?.profitMargin || 0;
    });

    protected readonly quickActions = [
        { label: 'New Sale', icon: '💰', action: 'sell' },
        { label: 'Add Product', icon: '📦', action: 'add-product' },
        { label: 'Inventory', icon: '📊', action: 'inventory' },
        { label: 'Reports', icon: '📈', action: 'reports' }
    ];

    ngOnInit(): void {
        // Fetch dashboard data when component initializes
        this.dashboardService.fetchDashboardData();
    }

    /**
     * Create category data from period stats
     */
    private createCategoryData(
        name: string,
        type: 'purchases' | 'sales' | 'expenses',
        color: string,
        periodStats: PeriodStats
    ): CategoryData {
        return {
            name,
            type,
            color,
            lightColor: this.hexToRgba(color, 0.1),
            stats: [
                { period: 'Today', amount: this.formatCurrency(periodStats.today) },
                { period: 'Week', amount: this.formatCurrency(periodStats.week) },
                { period: 'Month', amount: this.formatCurrency(periodStats.month) }
            ],
            accounts: periodStats.accounts.map(account => ({
                label: account.label,
                value: this.formatCurrency(account.value),
                icon: account.icon
            }))
        };
    }

    /**
     * Get default categories with zero values (used during loading)
     */
    private getDefaultCategories(): CategoryData[] {
        const emptyStats: PeriodStats = {
            today: 0,
            week: 0,
            month: 0,
            accounts: []
        };

        return [
            this.createCategoryData('Purchases', 'purchases', '#4361ee', emptyStats),
            this.createCategoryData('Sales', 'sales', '#36b37e', emptyStats),
            this.createCategoryData('Expenses', 'expenses', '#ff5c75', emptyStats),
        ];
    }

    /**
     * Format currency for display
     */
    private formatCurrency(amount: number): string {
        return `KES ${amount.toLocaleString('en-KE', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        })}`;
    }

    /**
     * Convert hex color to rgba
     */
    private hexToRgba(hex: string, alpha: number): string {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    toggleCategory(categoryType: string): void {
        if (this.expandedCategory() === categoryType) {
            this.expandedCategory.set(null);
        } else {
            this.expandedCategory.set(categoryType);
        }
    }

    toggleRecentActivity(): void {
        this.showRecentActivity.update(v => !v);
    }

    toggleQuickActions(): void {
        this.showQuickActions.update(v => !v);
    }

    handleQuickAction(action: string): void {
        console.log('Quick action:', action);
        // Handle navigation or action
    }

    /**
     * Refresh dashboard data
     */
    async refresh(): Promise<void> {
        await this.dashboardService.refresh();
    }
}

