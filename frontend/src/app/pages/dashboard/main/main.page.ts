import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  Inject,
  Signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { DailyFinancialsRecord } from "../../../../types/pocketbase-types";
import { TruncatePipe } from "../../../pipes/truncate.pipe";
import { AppStateService } from "../../../services/app-state.service";
import { DynamicUrlService } from "../../../services/dynamic-url.service";
import { OpenClose } from "../../../../types/main";
import { OpenCloseStateService } from "../../../services/open-close-state.service";

@Component({
  standalone: true,
  imports: [TruncatePipe, FormsModule, CommonModule],
  templateUrl: "./main.page.html",
  styleUrl: "./main.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainPage {
  weeklySales: Signal<DailyFinancialsRecord[]>;
  totalWeeklySales = 0;
  totalWeeklyPurchases = 0;
  totalSalesToday = 0;
  totalPurchasesToday = 0;
  periods = [
    {
      title: "Today",
      sales: 89400,
      expenses: 45000,
      purchases: 76200,
    },
    {
      title: "Yesterday",
      sales: 82100,
      expenses: 41000,
      purchases: 68900,
    },
    {
      title: "This Week",
      sales: 567800,
      expenses: 283900,
      purchases: 498600,
    },
  ];
  openCloseState: Signal<OpenClose>;

  constructor(
    @Inject(AppStateService) private readonly stateService: AppStateService,
    @Inject(DynamicUrlService)
    private readonly dynamicUrlService: DynamicUrlService,
    private readonly openCloseStateService: OpenCloseStateService,
    private cdr: ChangeDetectorRef,
  ) {
    this.weeklySales = this.stateService.weeklySales;
    this.openCloseState = this.openCloseStateService.openCloseState;

    effect(() => {
      this.totalWeeklySales = this.calculateTotalWeeklySales(
        this.stateService.weeklySales(),
      );
      // get total sales for today where each day has several opening and closing balances
      this.cdr.detectChanges(); // Trigger change detection
    });
  }
  onExpensesClick(period: string): void {
    console.log(`Expenses clicked for ${period}`);
    // Add your click handler logic here
  }

  onSalesClick(period: string): void {
    console.log(`Sales clicked for ${period}`);
    // Add your click handler logic here
  }

  onPurchasesClick(period: string): void {
    console.log(`Purchases clicked for ${period}`);
    // Add your click handler logic here
  }
  navigateToFinancial() {
    this.dynamicUrlService.navigateDashboardUrl(
      "open-close-financial",
      new Date().toISOString().split("T")[0],
      this.stateService.selectedCompany()!.id,
    );
  }

  navigateToStock() {
    this.dynamicUrlService.navigateDashboardUrl(
      "open-close-stock",
      new Date().toISOString().split("T")[0],
      this.stateService.selectedCompany()!.id,
    );
  }

  // calculate total weekly sales
  calculateTotalWeeklySales(weeklySales: DailyFinancialsRecord[]): number {
    console.log("Calculating total weekly sales");
    let totalClosingBalances = weeklySales.reduce(
      (acc, curr) => acc + (curr.closing_bal ?? 0),
      0,
    );
    let totalOpeningBalances = weeklySales.reduce(
      (acc, curr) => acc + (curr.opening_bal ?? 0),
      0,
    );
    return totalClosingBalances - totalOpeningBalances;
  }
}
