import { AfterViewInit, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './core/layout/toast/toast.component';
import { ToastService } from './core/services/toast.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit {
  protected readonly title = signal('dukahub-frontend');
  protected readonly toastService = inject(ToastService);

  ngAfterViewInit(): void {
    // Remove loading spinner once Angular has rendered
    const loadingElement = document.getElementById('app-loading');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
  }
}
