import { Routes } from '@angular/router';
import { authGuard, noAuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    // Marketing pages (include their own navbar/footer)
    {
        path: '',
        loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent)
    },
    {
        path: 'login',
        canActivate: [noAuthGuard],
        loadComponent: () =>
            import('./pages/auth/login/login.component').then((m) => m.LoginComponent)
    },
    {
        path: 'signup',
        canActivate: [noAuthGuard],
        loadComponent: () =>
            import('./pages/auth/signup/signup.component').then((m) => m.SignupComponent)
    },

    // Dashboard - separate layout with sidebar and mobile bottom nav
    {
        path: 'dashboard',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./dashboard/layout/dashboard-layout.component').then(
                (m) => m.DashboardLayoutComponent
            ),
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('./dashboard/pages/overview/overview.component').then((m) => m.OverviewComponent)
            },
            {
                path: 'sell',
                loadComponent: () =>
                    import('./dashboard/pages/sell/sell.component').then((m) => m.SellComponent)
            },
            {
                path: 'products',
                loadComponent: () =>
                    import('./dashboard/pages/products/products.component').then(
                        (m) => m.ProductsComponent
                    )
            },
            {
                path: 'inventory',
                loadComponent: () =>
                    import('./dashboard/pages/inventory/inventory.component').then(
                        (m) => m.InventoryComponent
                    )
            },
            {
                path: 'reports',
                loadComponent: () =>
                    import('./dashboard/pages/reports/reports.component').then((m) => m.ReportsComponent)
            },
            {
                path: 'settings',
                loadComponent: () =>
                    import('./dashboard/pages/settings/settings.component').then((m) => m.SettingsComponent)
            }
        ]
    },

    {
        path: '**',
        redirectTo: ''
    }
];
