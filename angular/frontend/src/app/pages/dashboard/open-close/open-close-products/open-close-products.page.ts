import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  EventEmitter,
  Inject,
  Output,
  signal,
  Signal,
  type OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MergedProductWithSKUs
} from '../../../../../types/main';
import { DailyStockTakesRecord, OpenCloseDetailsStatusOptions, ProductsRecord } from '../../../../../types/pocketbase-types';
import { AppStateService } from '../../../../services/app-state.service';
import { DbService } from '../../../../services/db.service';
import { OpenCloseStateService } from '../../../../services/open-close-state.service';
import { ProductsStateService } from '../../../../services/products-state.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'open-close-products-page',
  templateUrl: './open-close-products.page.html',
  styleUrl: './open-close-products.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenCloseProductsPage implements OnInit {
  @Output() dailyStockRecords = new EventEmitter<DailyStockTakesRecord[]>();

  localpDailyStockRecords: DailyStockTakesRecord[] = [];
  loadingProducts = false;
  mergedProductWithSKUs = signal<MergedProductWithSKUs[]>([]);
  openCloseState: Signal<OpenCloseDetailsStatusOptions>;

  constructor(
    @Inject(DbService) private readonly db: DbService,
    @Inject(ProductsStateService) private readonly productsStateService: ProductsStateService,
    @Inject(OpenCloseStateService) private readonly openCloseStateService: OpenCloseStateService,
    @Inject(AppStateService) private readonly stateService: AppStateService,
    private cdr: ChangeDetectorRef
  ) {
    this.openCloseState = this.openCloseStateService.openCloseState;

    effect(() => {
      const result = this.productsStateService.mergeProductsAndSKUs();
      result.forEach(product => {
        this.localpDailyStockRecords.push({
          product: product.id,
          sku: product.skusArray[0].id,
          company: product.company,
          date: new Date().toISOString(),
          user: this.stateService.user()?.id!!,
          id: "",
          opening_bal: 0,
          closing_bal: 0
        });
      });

      this.mergedProductWithSKUs.set(result);
    }, { allowSignalWrites: true });
  }



  generateImageURL(product: ProductsRecord): string {
    return this.db.generateURL(product, product.image);
  }
  ngOnInit(): void { }

  onSubmit() {
    this.dailyStockRecords.emit(this.localpDailyStockRecords);
  }
}

