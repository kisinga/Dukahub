import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { DbService } from './app/services/db.service';
import { AppStateService } from './app/services/app-state.service';
import { UsersResponse } from './types/pocketbase-types';
import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';

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


