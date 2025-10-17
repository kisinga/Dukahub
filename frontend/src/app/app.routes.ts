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
                path: 'products/create',
                loadComponent: () =>
                    import('./dashboard/pages/product-create/product-create.component').then(
                        (m) => m.ProductCreateComponent
                    )
            },
            {
                path: 'products/edit/:id',
                loadComponent: () =>
                    import('./dashboard/pages/product-edit/product-edit.component').then(
                        (m) => m.ProductEditComponent
                    )
            },
            {
                path: 'customers',
                loadComponent: () =>
                    import('./dashboard/pages/customers/customers.component').then(
                        (m) => m.CustomersComponent
                    )
            },
            {
                path: 'customers/create',
                loadComponent: () =>
                    import('./dashboard/pages/customer-create/customer-create.component').then(
                        (m) => m.CustomerCreateComponent
                    )
            },
            {
                path: 'customers/edit/:id',
                loadComponent: () =>
                    import('./dashboard/pages/customer-edit/customer-edit.component').then(
                        (m) => m.CustomerEditComponent
                    )
            },
            {
                path: 'suppliers',
                loadComponent: () =>
                    import('./dashboard/pages/suppliers/suppliers.component').then(
                        (m) => m.SuppliersComponent
                    )
            },
            {
                path: 'suppliers/create',
                loadComponent: () =>
                    import('./dashboard/pages/supplier-create/supplier-create.component').then(
                        (m) => m.SupplierCreateComponent
                    )
            },
            {
                path: 'suppliers/edit/:id',
                loadComponent: () =>
                    import('./dashboard/pages/supplier-edit/supplier-edit.component').then(
                        (m) => m.SupplierEditComponent
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
