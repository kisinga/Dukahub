import {
  ChangeDetectorRef,
  Component,
  effect,
  Inject,
  Signal,
} from "@angular/core";
import { OpenCloseProductsPage } from "./open-close-products/open-close-products.page";
import { OpenCloseFinancialPage } from "./open-close-financial/open-close-financial.page";
import {
  MergedDailyFInancialWithAccount,
  OpenClose,
  ProductSKUBalances,
} from "../../../../types/main";
import { OpenCloseStateService } from "../../../services/open-close-state.service";
import { ToastService } from "../../../services/toast.service";
import { DbService } from "../../../services/db.service";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-open-close",
  standalone: true,
  imports: [OpenCloseProductsPage, OpenCloseFinancialPage, CommonModule],
  templateUrl: "./open-close.component.html",
  styleUrl: "./open-close.component.scss",
})
export class OpenCloseComponent {
  openCloseState: Signal<OpenClose>;
  customStrings = {
    bannerMessage: "",
    header: "",
    actionLabel: "",
  };

  activePage = 1;
  financialData: MergedDailyFInancialWithAccount[] = [];
  productData: ProductSKUBalances = {};

  constructor(
    @Inject(ToastService) private readonly toastService: ToastService,
    @Inject(DbService) private readonly db: DbService,
    private readonly openCloseStateService: OpenCloseStateService,
    private cdr: ChangeDetectorRef,
  ) {
    this.openCloseState = this.openCloseStateService.openCloseState;
    effect(() => {
      switch (this.openCloseState()) {
        case "open":
          this.customStrings.bannerMessage =
            "You are about to CLOSE the register";
          this.customStrings.header = "Closing Balance";
          this.customStrings.actionLabel = "Close Register";
          break;
        default:
          this.customStrings.bannerMessage =
            "You are about to OPEN the register";
          this.customStrings.header = "Opening Balance";
          this.customStrings.actionLabel = "Open Register";
      }
      this.cdr.detectChanges();
    });
  }
  onFinancialDataReceived(data: MergedDailyFInancialWithAccount[]) {
    this.financialData = data;
    this.activePage = 2;
    console.log("financial data received", data);
  }

  onProductDataReceived(data: ProductSKUBalances) {
    this.productData = data;
    this.activePage = 2;
    console.log("product data received", data);
  }

  nextStep() {
    if (this.activePage < 2) {
      this.activePage++;
    }
  }

  previousStep() {
    if (this.activePage > 1) {
      this.activePage--;
    }
  }
  asubmitAllData() {
    this.db
      .toggleDayOperationState({
        financialData: this.financialData,
        productData: this.productData,
      })
      .then((res) => {
        console.log(res);
        this.toastService.show("Data submitted successfully");
      })
      .catch((err) => {
        console.log(err);
        this.toastService.show("Error submitting data");
      });
  }
}
