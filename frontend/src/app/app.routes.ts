import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: 'login', loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage) },
    { path: '', loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage) },
    { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage) },
];
