import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  EventEmitter,
  Inject,
  Output,
  Signal,
  type OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MergedProductWithSKUs,
  ProductSKUBalances,
} from '../../../../../types/main';
import { ProductsRecord } from '../../../../../types/pocketbase-types';
import { CustomInputComponent } from '../../../../components/custom-input/custom-input.component';
import { DbService } from '../../../../services/db.service';
import { ProductsStateService } from '../../../../services/products-state.service';

@Component({
  standalone: true,
  imports: [CustomInputComponent, CommonModule, FormsModule,],
  selector: 'open-close-products-page',
  templateUrl: './open-close-products.page.html',
  styleUrl: './open-close-products.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenCloseProductsPage implements OnInit {
  @Output() productSKUBalances = new EventEmitter<ProductSKUBalances>();

  localproductSKUBalances: ProductSKUBalances = {};
  loadingProducts = false;
  mergedProductWithSKUs: Signal<MergedProductWithSKUs[]>;

  constructor(
    @Inject(DbService) private readonly db: DbService,
    @Inject(ProductsStateService)
    private readonly productsStateService: ProductsStateService,
    private cdr: ChangeDetectorRef
  ) {
    this.mergedProductWithSKUs = this.productsStateService.mergeProductsAndSKUs;
    console.log(this.mergedProductWithSKUs);
    effect(() => {
      const test = this.productsStateService.mergeProductsAndSKUs();
      console.log(test);
      this.initData();
      this.cdr.detectChanges();
    });
  }

  initData() {
    for (const product of this.mergedProductWithSKUs()) {
      this.localproductSKUBalances[product.id] = {};
      for (const sku of product.skusArray) {
        this.localproductSKUBalances[product.id][sku.id] = null;
      }
    }
  }

  generateImageURL(product: ProductsRecord): string {
    return this.db.generateURL(product, product.image);
  }
  ngOnInit(): void { }

  onSubmit() {
    console.log(this.productSKUBalances);
    console.log(this.localproductSKUBalances);
  }
}
