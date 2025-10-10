import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

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

@Component({
    selector: 'app-overview',
    imports: [CommonModule],
    templateUrl: './overview.component.html',
    styleUrl: './overview.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OverviewComponent {
    protected readonly expandedCategory = signal<string | null>(null);
    protected readonly showRecentActivity = signal(false);
    protected readonly showQuickActions = signal(false);

    protected readonly categories: CategoryData[] = [
        {
            name: 'Purchases',
            type: 'purchases',
            color: '#4361ee',
            lightColor: 'rgba(67, 97, 238, 0.1)',
            stats: [
                { period: 'Today', amount: 'KES 18,450' },
                { period: 'Week', amount: 'KES 125,680' },
                { period: 'Month', amount: 'KES 487,230' }
            ],
            accounts: [
                { label: 'Inventory', value: 'KES 15,200', icon: '📦' },
                { label: 'Supplies', value: 'KES 2,100', icon: '🛠️' },
                { label: 'Utilities', value: 'KES 1,150', icon: '💡' }
            ]
        },
        {
            name: 'Sales',
            type: 'sales',
            color: '#36b37e',
            lightColor: 'rgba(54, 179, 126, 0.1)',
            stats: [
                { period: 'Today', amount: 'KES 45,230' },
                { period: 'Week', amount: 'KES 312,560' },
                { period: 'Month', amount: 'KES 1,245,890' }
            ],
            accounts: [
                { label: 'Cash Sales', value: 'KES 32,100', icon: '💵' },
                { label: 'M-Pesa', value: 'KES 11,230', icon: '📱' },
                { label: 'Credit', value: 'KES 1,900', icon: '🏦' }
            ]
        },
        {
            name: 'Expenses',
            type: 'expenses',
            color: '#ff5c75',
            lightColor: 'rgba(255, 92, 117, 0.1)',
            stats: [
                { period: 'Today', amount: 'KES 8,120' },
                { period: 'Week', amount: 'KES 56,340' },
                { period: 'Month', amount: 'KES 234,670' }
            ],
            accounts: [
                { label: 'Rent', value: 'KES 25,000', icon: '🏠' },
                { label: 'Salaries', value: 'KES 45,000', icon: '👥' },
                { label: 'Other', value: 'KES 5,340', icon: '📋' }
            ]
        }
    ];

    protected readonly recentActivity: RecentActivity[] = [
        { id: '#12345', type: 'Sale', description: 'Panadol 500mg', amount: '+KES 450', time: '2m' },
        { id: '#12344', type: 'Sale', description: 'Milk 1L', amount: '+KES 150', time: '15m' },
        { id: '#12343', type: 'Purchase', description: 'Stock reorder', amount: '-KES 8,200', time: '1h' },
        { id: '#12342', type: 'Expense', description: 'Utilities', amount: '-KES 1,150', time: '2h' }
    ];

    protected readonly quickActions = [
        { label: 'New Sale', icon: '💰', action: 'sell' },
        { label: 'Add Product', icon: '📦', action: 'add-product' },
        { label: 'Inventory', icon: '📊', action: 'inventory' },
        { label: 'Reports', icon: '📈', action: 'reports' }
    ];

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
}

