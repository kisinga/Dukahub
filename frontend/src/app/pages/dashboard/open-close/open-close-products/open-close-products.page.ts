import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  EventEmitter,
  Inject,
  Input,
  Output,
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
  MergedDailyProductWithSKU,
  MergedProductWithSKUs,
} from "../../../../../types/main";
import {
  Collections,
  DailyStocksResponse,
} from "../../../../../types/pocketbase-types";
import { AppStateService } from "../../../../services/app-state.service";
import { DbService } from "../../../../services/db.service";
import { DynamicUrlService } from "../../../../services/dynamic-url.service";
import { ProductsStateService } from "../../../../services/products-state.service";
import { DailyProductStateService } from "../../../../services/daily-products-state.service";
import { CustomInputComponent } from "../../../../components/custom-input/custom-input.component";

// ProductID: SKUID: Balance
type ProductSKUBalances = { [key: string]: { [key: string]: number } };

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
  @Output() productData = new EventEmitter<MergedDailyProductWithSKU[]>();

  skuBalances: ProductSKUBalances = {};
  loadingProducts = false;
  dailyProductRecord: (MergedDailyProductWithSKU & { imageURL: string })[] = [];
  dailyStocks: DailyStocksResponse[] = [];

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
    effect(async () => {
      if (
        this.stateService.selectedCompanyAccounts().length > 0 &&
        this.stateService.selectedDate() !== null &&
        this.productsStateService.mergeProductsAndSKUs().length > 0 &&
        this.productsStateService.mergeProductsAndSKUs().length > 0
      ) {
        // change the url segment whenver the selected company and date change
        this.dynamicUrlService.updateDashboardUrl(
          "open-close-financial",
          this.stateService.selectedDateUTC(),
          this.stateService.selectedCompany()!.id,
        );
        await this.initData();
      }
    });
    effect(() => {
      this.dailyStocks = this.dailyStockStateService.dailyStockRecords();
      this.initData();
    });
  }

  async initData(): Promise<void> {
    this.dailyProductRecord = this.productsStateService
      .mergeProductsAndSKUs()
      .map((product) => {
        this.skuBalances[product.id] = {};
        product.skus.forEach((sku) => {
          this.skuBalances[product.id][sku] = 0;
        });

        let relatedStock = this.dailyStocks.find(
          (stock) => stock.product === product.id,
        );
        if (!relatedStock) {
          let emptyStock: DailyStocksResponse = {
            date: this.stateService.selectedDateUTC(),
            product: product.id,
            company: this.stateService.selectedCompany()?.id!!,
            opening_bal: 0,
            closing_bal: 0,
            user: this.stateService.user()?.id!!,
            updated: "",
            collectionId: "",
            collectionName: Collections.DailyStocks,
            id: "",
            created: "",
            sku: "",
          };
          return {
            ...emptyStock,
            relatedMergedProductWithSKUs: product,
            imageURL: this.db.generateURL(product, product.image),
          };
        }
        return {
          ...relatedStock,
          relatedMergedProductWithSKUs: product,
          imageURL: this.db.generateURL(product, product.image),
        };
      });

    console.log("Daily Products:", this.dailyProductRecord);
    this.cdr.detectChanges();
  }
  ngOnInit(): void {}

  onSubmit() {
    console.log(this.dailyProductRecord);
    console.log(this.skuBalances);
  }
}
