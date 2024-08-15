import { Inject, Injectable } from '@angular/core';
import { Router, type ActivatedRouteSnapshot, type CanActivate, type RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { DbService } from '../services/db.service';


@Injectable({
  providedIn: 'root'
})
export class DashboardAuthGuard implements CanActivate {
  constructor(
    @Inject(DbService) private readonly db: DbService,
    @Inject(Router) private readonly router: Router,
  ) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkUserAuthentication();
  }

  private checkUserAuthentication(): boolean {
    const user = this.db.user()
    if (user) {
      return true;
    } else {
      // Redirect to the login page
      this.router.navigate(['/login']);
      return false;
    }
  }
}