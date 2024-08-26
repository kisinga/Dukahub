import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class DynamicUrlService {
  constructor(private router: Router) { }


  updateDashboardUrl(route: string, date: string, company: string): void {
    const currentUrl = new URL(window.location.href);
    const path = '/dashboard/' + route;

    // only navigate to the dashboard if the current path is not the dashboard
    if (currentUrl.pathname !== path) {
      return;
    }

    currentUrl.pathname = path;
    currentUrl.searchParams.set('date', date);
    currentUrl.searchParams.set('company', company);

    window.history.pushState({}, '', currentUrl.toString());
  }

  navigateDashboardUrl(path: string, date: string, company: string): void {

    const queryParams = { date, company };

    this.router.navigate(["dashboard/" + path], {
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  getDashboardUrl(): string {
    return window.location.href;
  }
}