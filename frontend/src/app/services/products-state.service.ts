import { computed, effect, Inject, Injectable, signal } from '@angular/core';
import { DbOperation, MergedProductWithSKUs } from '../../types/main';
import { Collections, ProductsResponse, SkusResponse } from '../../types/pocketbase-types';
import { AppStateService } from './app-state.service';
import { DbService } from './db.service';

@Injectable({
  providedIn: 'root',
})
export class ProductsStateService {
  products = signal<ProductsResponse[]>([]);
  SKUs = signal<SkusResponse[]>([]);

  mergeProductsAndSKUs = computed<MergedProductWithSKUs[]>(() => {
    if (this.SKUs().length > 0 && this.products().length > 0) {
      return this.products().map((product) => {
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
    @Inject(DbService) private readonly db: DbService
  ) {

    effect(() => {
      if (this.stateService.selectedCompany() != undefined) {
        this.initData(this.stateService.selectedCompany()?.id!!);
      }
    });
  }

  //@TODO we probably want to create a db subscription that re-runs this whenever any of the products or SKUs change
  async initData(companyID: string) {
    console.log('init data', companyID);
    let queryOptions = {
      filter: 'company = ' + companyID,
    };

    const productsData = await this.db.execute<ProductsResponse>(Collections.Products, {
      operation: DbOperation.list_search,
      options: queryOptions
    })

    const skuData = await this.db.execute<SkusResponse>(Collections.Products, {
      operation: DbOperation.list_search,
    })
    if (Array.isArray(productsData) && Array.isArray(skuData)) {
      this.products.set(productsData);
      this.SKUs.set(skuData);
    } else {
      console.log("Invalid response")
    }

  }
}
