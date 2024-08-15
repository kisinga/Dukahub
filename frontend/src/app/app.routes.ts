import { Routes } from '@angular/router';
import { DashboardAuthGuard } from './guards/dashboardAuth.guard';

export const routes: Routes = [
    { path: 'login', loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage) },
    { path: '', loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage) },
    {
        path: 'dashboard',
        canActivate: [DashboardAuthGuard],
        loadChildren: () => import('./pages/dashboard/dashboard.routes').then((m) => m.routes)
    },
];
