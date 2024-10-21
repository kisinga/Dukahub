import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  EventEmitter,
  Inject,
  Input,
  Output,
  Signal,
  type OnInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormsModule,
  FormBuilder,
  FormControl,
  FormGroup,
} from "@angular/forms";
import {
  MergedProductWithSKUs,
  ProductSKUBalances,
} from "../../../../../types/main";
import {
  Collections,
  DailyStocksResponse,
  ProductsRecord,
} from "../../../../../types/pocketbase-types";
import { AppStateService } from "../../../../services/app-state.service";
import { DbService } from "../../../../services/db.service";
import { DynamicUrlService } from "../../../../services/dynamic-url.service";
import { ProductsStateService } from "../../../../services/products-state.service";
import { DailyProductStateService } from "../../../../services/daily-products-state.service";
import { CustomInputComponent } from "../../../../components/custom-input/custom-input.component";

@Component({
  standalone: true,
  imports: [CustomInputComponent, CommonModule, FormsModule],
  selector: "open-close-products-page",
  templateUrl: "./open-close-products.page.html",
  styleUrl: "./open-close-products.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenCloseProductsPage implements OnInit {
  @Input() header: string = "";
  @Input() actionLabel: string = "";
  @Output() productSKUBalances = new EventEmitter<ProductSKUBalances>();

  skuBalances: ProductSKUBalances = {};
  loadingProducts = false;
  mergedProductWithSKUs: Signal<MergedProductWithSKUs[]>;

  constructor(
    @Inject(DbService) private readonly db: DbService,
    @Inject(AppStateService) private readonly stateService: AppStateService,
    @Inject(DynamicUrlService)
    private readonly dynamicUrlService: DynamicUrlService,
    @Inject(ProductsStateService)
    private readonly productsStateService: ProductsStateService,
    @Inject(DailyProductStateService)
    private readonly dailyStockStateService: DailyProductStateService,
    private cdr: ChangeDetectorRef,
  ) {
    this.mergedProductWithSKUs = this.productsStateService.mergeProductsAndSKUs;
    effect(() => {
      this.productsStateService.mergeProductsAndSKUs;
      this.initData();
      this.cdr.detectChanges();
    });
  }

  initData() {
    this.mergedProductWithSKUs().forEach((product) => {
      this.skuBalances[product.id] = {};

      for (let sku of product.skus) {
        this.skuBalances[product.id][sku] = null;
      }
    });
  }

  generateImageURL(product: ProductsRecord): string {
    return this.db.generateURL(product, product.image);
  }
  ngOnInit(): void {}

  onSubmit() {
    console.log(this.productSKUBalances);
    console.log(this.skuBalances);
  }
}
