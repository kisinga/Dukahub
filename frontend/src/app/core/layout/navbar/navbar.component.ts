import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent {
  protected readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update(value => !value);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}

