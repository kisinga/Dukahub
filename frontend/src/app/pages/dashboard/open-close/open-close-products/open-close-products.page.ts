import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  Inject,
  type OnInit,
} from "@angular/core";
import { FormArray, FormBuilder, FormGroup } from "@angular/forms";
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
import { ToastService } from "../../../../services/toast.service";
import { DailyProductStateService } from "../../../../services/daily-products-state.service";

@Component({
  standalone: true,
  imports: [],
  templateUrl: "./open-close-products.page.html",
  styleUrl: "./open-close-products.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenCloseProductsPage implements OnInit {
  loadingProducts = false;
  dailyProductRecord: (MergedDailyProductWithSKU & { imageURL: string })[] = [];
  balanceForm: FormGroup;
  dailyStocks: DailyStocksResponse[] = [];

  constructor(
    @Inject(ToastService) private readonly toastService: ToastService,
    @Inject(DbService) private readonly db: DbService,
    @Inject(AppStateService) private readonly stateService: AppStateService,
    @Inject(DynamicUrlService)
    private readonly dynamicUrlService: DynamicUrlService,
    @Inject(ProductsStateService)
    private readonly productsStateService: ProductsStateService,
    @Inject(DailyProductStateService)
    private readonly dailyStockStateService: DailyProductStateService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.balanceForm = this.fb.group({
      skuBalances: this.fb.array([]),
    });

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
  onSave(updatedData: any[]): void {}
  get skuBalances() {
    return this.balanceForm.get("skuBalances") as FormArray;
  }

  increment(index: number, field: "openingBalance" | "closingBalance") {
    const currentValue = this.skuBalances.at(index).get(field)?.value || 0;
    this.skuBalances
      .at(index)
      .get(field)
      ?.setValue(currentValue + 1);
  }

  decrement(index: number, field: "openingBalance" | "closingBalance") {
    const currentValue = this.skuBalances.at(index).get(field)?.value || 0;
    if (currentValue > 0) {
      this.skuBalances
        .at(index)
        .get(field)
        ?.setValue(currentValue - 1);
    }
  }

  copyOpeningToClosing(index: number) {
    const openingBalance = this.skuBalances
      .at(index)
      .get("openingBalance")?.value;
    this.skuBalances.at(index).get("closingBalance")?.setValue(openingBalance);
  }

  resetForm() {
    this.balanceForm.reset();
    this.skuBalances.controls.forEach((control) => {
      control.setValue({ openingBalance: 0, closingBalance: 0 });
    });
  }

  onSubmit() {
    console.log(this.balanceForm.value);

    if (this.balanceForm.valid) {
      console.log(this.balanceForm.value);
      // Here you would typically send this data to your backend
    }
  }
}
