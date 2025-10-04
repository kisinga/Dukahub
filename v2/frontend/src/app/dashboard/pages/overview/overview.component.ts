import { ChangeDetectionStrategy, Component } from '@angular/core';

interface StatCard {
    title: string;
    value: string;
    change: string;
    icon: string;
    trend: 'up' | 'down';
}

interface RecentSale {
    id: string;
    product: string;
    amount: string;
    time: string;
}

@Component({
    selector: 'app-overview',
    imports: [],
    templateUrl: './overview.component.html',
    styleUrl: './overview.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OverviewComponent {
    protected readonly stats: StatCard[] = [
        {
            title: 'Today\'s Sales',
            value: 'KES 45,230',
            change: '+12.5%',
            icon: '💰',
            trend: 'up'
        },
        {
            title: 'Total Products',
            value: '234',
            change: '+5',
            icon: '📦',
            trend: 'up'
        },
        {
            title: 'Low Stock Items',
            value: '12',
            change: '-3',
            icon: '⚠️',
            trend: 'down'
        },
        {
            title: 'Active Users',
            value: '3',
            change: '0',
            icon: '👥',
            trend: 'up'
        }
    ];

    protected readonly recentSales: RecentSale[] = [
        { id: '#12345', product: 'Panadol 500mg', amount: 'KES 450', time: '2 min ago' },
        { id: '#12344', product: 'Milk 1L', amount: 'KES 150', time: '15 min ago' },
        { id: '#12343', product: 'Bread', amount: 'KES 60', time: '1 hour ago' },
        { id: '#12342', product: 'Sugar 2kg', amount: 'KES 280', time: '2 hours ago' },
        { id: '#12341', product: 'Rice 5kg', amount: 'KES 800', time: '3 hours ago' }
    ];
}

