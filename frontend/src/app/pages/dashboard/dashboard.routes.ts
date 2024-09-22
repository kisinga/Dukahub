import type { Routes } from "@angular/router";
import { DashboardPage } from "./dashboard.page";
import { dashboardResolver } from "./dashboard.resolver";

export const routes: Routes = [
  {
    path: "",
    component: DashboardPage,
    resolve: { ready: dashboardResolver },
    children: [
      {
        path: "",
        loadComponent: () => import("./main/main.page").then((m) => m.MainPage),
      },
      {
        path: "open-close-financial",
        loadComponent: () =>
          import(
            "./open-close/open-close-financial/open-close-financial.page"
          ).then((m) => m.OpenCloseFinancialPage),
      },
      {
        path: "open-close-stock",
        loadComponent: () =>
          import(
            "./open-close/open-close-products/open-close-products.page"
          ).then((m) => m.OpenCloseProductsPage),
      },
      {
        path: "config",
        loadComponent: () =>
          import("./config/config.page").then((m) => m.ConfigPage),
      },
      {
        path: "manage",
        loadComponent: () =>
          import("./manage/manage.page").then((m) => m.ManagePage),
      },
      {
        path: "transactions",
        loadComponent: () =>
          import("./transactions/transactions.page").then(
            (m) => m.TransactionsPage,
          ),
      },
    ],
  },
];
