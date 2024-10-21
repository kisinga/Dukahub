import { CommonModule } from "@angular/common";
import {
  ChangeDetectorRef,
  Component,
  effect,
  Inject,
  Signal,
  ViewChild,
} from "@angular/core";
import {
  AccountBalances,
  OpenClose,
  ProductSKUBalances,
} from "../../../../types/main";
import { DbService } from "../../../services/db.service";
import { OpenCloseStateService } from "../../../services/open-close-state.service";
import { ToastService } from "../../../services/toast.service";
import { OpenCloseFinancialPage } from "./open-close-financial/open-close-financial.page";
import { OpenCloseProductsPage } from "./open-close-products/open-close-products.page";

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
  accountBalances: AccountBalances = {};
  productSKUBalances: ProductSKUBalances = {};
  @ViewChild(OpenCloseFinancialPage) openCloseFinancialPage!: OpenCloseFinancialPage;

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
  onFinancialDataReceived(data: AccountBalances) {
    this.accountBalances = data;
    this.activePage = 2;
    console.log("financial data received", data);
  }

  onProductDataReceived(data: ProductSKUBalances) {
    this.productSKUBalances = data;
    this.activePage = 2;
    console.log("product data received", data);
  }

  nextStep() {
    if (this.activePage < 2) {
      this.openCloseFinancialPage.onSubmit();
      this.activePage++;
    } else {
      // this.openCloseProductsPage.onSubmit();
      this.submitAllData();
    }
  }

  previousStep() {
    if (this.activePage > 1) {
      this.activePage--;
    }
  }
  submitAllData() {
    console.log(this.accountBalances);
    console.log(this.productSKUBalances);
    this.db
      .toggleDayOperationState({
        accountBalances: this.accountBalances,
        productSKUBalances: this.productSKUBalances,
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
