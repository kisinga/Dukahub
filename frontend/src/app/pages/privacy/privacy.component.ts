import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../core/layout/footer/footer.component';
import { NavbarComponent } from '../../core/layout/navbar/navbar.component';

@Component({
  selector: 'app-privacy',
  imports: [RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrivacyComponent {
  protected readonly lastUpdated = '2024-01-01';
}











