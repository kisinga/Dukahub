import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { AppStateService } from '../services/app-state.service';

export const DashboardAuthGuard = () => {
  const stateService = inject(AppStateService);
  const router = inject(Router);

  if (stateService.loadingUser()) {
    return true; // Allow the route to activate while loading
  }

  if (stateService.isAuthenticated()) {
    return true;
  }

  // Redirect to login page
  return router.parseUrl('/login');
}