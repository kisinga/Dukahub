import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Product search and filter bar component
 * Provides search input with clear button and filter drawer toggle
 */
@Component({
  selector: 'app-product-search-bar',
  imports: [CommonModule, FormsModule],
  templateUrl: './product-search-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductSearchBarComponent {
  readonly placeholder = input<string>('Search by name, description, or SKU...');
  readonly searchQuery = model<string>('');
  readonly filterClick = output<void>();

  clearSearch(): void {
    this.searchQuery.set('');
  }
}
