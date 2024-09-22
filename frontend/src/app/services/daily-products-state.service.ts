import { effect, Inject, Injectable, signal } from "@angular/core";
import { DailyStocksResponse } from "../../types/pocketbase-types";
import { AppStateService } from "./app-state.service";
import { DbService } from "./db.service";

@Injectable({
  providedIn: "root",
})
export class DailyProductStateService {
  dailyStockRecords = signal<DailyStocksResponse[]>([]);
  constructor(
    @Inject(AppStateService) private readonly stateService: AppStateService,
    @Inject(DbService) private readonly db: DbService,
  ) {}

  private async fetchDailyStocks() {
    let queryOption = {
      filter: `date ?~ "${this.stateService.selectedDateUTC()}" && company = "${this.stateService.selectedCompany()?.id!!}"`,
    };
    this.dailyStockRecords.set(await this.db.fetchDailyStocks(queryOption));
  }

  async saveDailyProducts(dailyProducts: DailyStocksResponse[]) {}

  async refreshStockRecords() {
    await this.fetchDailyStocks();
  }
}
