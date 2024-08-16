import type { Routes } from '@angular/router';
import { DashboardPage } from './dashboard.page';

export const routes: Routes = [
    {
        path: '',
        component: DashboardPage,
        children: [
            { path: '', loadComponent: () => import('./main/main.page').then((m) => m.MainPage) },
            { path: 'open-close', loadComponent: () => import('./open-close/open-close.page').then((m) => m.OpenClosePage) },
            { path: 'config', loadComponent: () => import('./config/config.page').then((m) => m.ConfigPage) },
            { path: 'manage', loadComponent: () => import('./manage/manage.page').then((m) => m.ManagePage) },
            { path: 'transactions', loadComponent: () => import('./transactions/transactions.page').then((m) => m.TransactionsPage) },
        ],
    },
];
