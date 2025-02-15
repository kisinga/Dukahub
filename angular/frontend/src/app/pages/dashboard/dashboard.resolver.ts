import { effect, inject } from '@angular/core';
import { AppStateService } from '../../services/app-state.service';

export const dashboardResolver = () => {
    const stateService = inject(AppStateService);

    return new Promise<boolean>(resolve => {
        if (!stateService.loadingUser()) {
            console.log('Resolver: Done Loading User');
            resolve(true);
        } else {
            effect(() => {
                if (!stateService.loadingUser()) {
                    console.log('Resolver: Done Loading User');
                    resolve(true);
                }
            });
        }
    });
};