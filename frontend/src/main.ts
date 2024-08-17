import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { AppStateService } from './app/services/app-state.service';
import { DbService } from './app/services/db.service';
import { UsersResponse } from './types/pocketbase-types';

function initializeAppFactory(dbService: DbService, stateService: AppStateService) {
  return () => new Promise<void>((resolve) => {
    let authStore = dbService.getAuthStore();
    authStore.onChange((auth) => {
      if (auth) {
        console.log('Authenticated');
        stateService.setUser(authStore.model! as UsersResponse)
        resolve();

      } else {
        console.log('Not authenticated');
        resolve();

      }
    }, true);
  });

}

const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    {
      provide: APP_INITIALIZER,
      useFactory: (dbService: DbService, stateService: AppStateService) =>
        initializeAppFactory(dbService, stateService),
      deps: [DbService, AppStateService],
      multi: true
    }
  ]
};

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));


