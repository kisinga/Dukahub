import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: 'login', loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage) },
    { path: '', loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage) },
    { path: 'dashboard', loadChildren: () => import('./pages/dashboard/dashboard.routes').then((m) => m.routes) },
];
