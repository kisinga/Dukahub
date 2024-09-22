import { computed, effect, Inject, Injectable, signal } from "@angular/core";
import { MergedProductWithSKUs } from "../../types/main";
import { ProductsResponse, SkusResponse } from "../../types/pocketbase-types";
import { AppStateService } from "./app-state.service";
import { DbService } from "./db.service";

@Injectable({
  providedIn: "root",
})
export class ProductsStateService {
  products = signal<ProductsResponse[]>([]);
  SKUs = signal<SkusResponse[]>([]);

  mergeProductsAndSKUs = computed<MergedProductWithSKUs[]>(() => {
    let products = this.products();
    if (this.SKUs().length > 0 && products.length > 0) {
      return products.map((product) => {
        // for every product, get the skus that match the product skus array
        let skus = this.SKUs().filter((sku) => product.skus.includes(sku.id));

        return {
          ...product,
          skusArray: skus,
        };
      });
    } else {
      return [];
    }
  });

  constructor(
    @Inject(AppStateService) private readonly stateService: AppStateService,
    @Inject(DbService) private readonly db: DbService,
  ) {
    effect(() => {
      if (
        this.stateService.selectedCompany() &&
        this.stateService.selectedDate() !== null
      ) {
        this.initData(this.stateService.selectedCompany()?.id!!);
      }
    });
  }

  //@TODO we probably want to create a db subscription that re-runs this whenever any of the products or SKUs change
  async initData(companyID: string) {
    let queryOptions = {
      filter: "company=" + companyID,
    };
    this.products.set(await this.db.fetchProducts(queryOptions));
    this.SKUs.set(await this.db.fetchSkus());
  }
}
