import { Inject, Injectable } from '@angular/core';
import { Router, type ActivatedRouteSnapshot, type CanActivate, type RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { DbService } from '../services/db.service';
import { AppStateService } from '../services/app-state.service';


@Injectable({
  providedIn: 'root'
})
export class DashboardAuthGuard implements CanActivate {
  constructor(
    @Inject(AppStateService) private readonly state: AppStateService,
    @Inject(Router) private readonly router: Router,
  ) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkUserAuthentication();
  }

  private checkUserAuthentication(): boolean {
    const user = this.state.user()
    if (user) {
      return true;
    } else {
      // Redirect to the login page
      this.router.navigate(['/login']);
      return false;
    }
  }
}