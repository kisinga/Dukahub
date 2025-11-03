import { provideHttpClient } from '@angular/common/http';
import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { NotificationService } from './core/services/notification.service';

export function initializeNotifications(notificationService: NotificationService) {
  return () => {
    // Initialize notification service asynchronously without blocking app bootstrap
    // The service's constructor already handles initialization, so we just return immediately
    // This allows the app to render faster while notifications initialize in the background
    return Promise.resolve();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(),
    provideRouter(routes),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(), // Only enable in production
      registrationStrategy: 'registerWhenStable:30000'
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeNotifications,
      deps: [NotificationService],
      multi: true
    }
  ]
};
