import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DynamicUrlService {

  updateDashboardUrl(date: string, company: string): void {
    const currentUrl = new URL(window.location.href);
    const path = '/dashboard/open-close-financial';

    // only navigate to the dashboard if the current path is not the dashboard
    if (currentUrl.pathname !== path) {
      return;
    }

    currentUrl.pathname = path;
    currentUrl.searchParams.set('date', date);
    currentUrl.searchParams.set('company', company);

    window.history.pushState({}, '', currentUrl.toString());
  }

  getDashboardUrl(): string {
    return window.location.href;
  }
}