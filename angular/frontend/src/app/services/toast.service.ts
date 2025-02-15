
// toast.service.ts
import { ApplicationRef, ComponentRef, createComponent, EnvironmentInjector, Injectable } from '@angular/core';
import { ToastComponent } from '../pages/dashboard/toast/toast.component';

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    private toastRef: ComponentRef<ToastComponent> | null = null;

    constructor(
        private appRef: ApplicationRef,
        private injector: EnvironmentInjector
    ) { }

    show(message: string, timeout: number = 3000, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
        this.hide(); // Hide any existing toast

        const toastComponent = createComponent(ToastComponent, {
            environmentInjector: this.injector
        });

        toastComponent.instance.message = message;
        toastComponent.instance.timeout = timeout;
        toastComponent.instance.type = type;

        document.body.appendChild(toastComponent.location.nativeElement);
        this.appRef.attachView(toastComponent.hostView);

        this.toastRef = toastComponent;

        setTimeout(() => this.hide(), timeout);
    }

    hide() {
        if (this.toastRef) {
            this.appRef.detachView(this.toastRef.hostView);
            this.toastRef.destroy();
            this.toastRef = null;
        }
    }
}