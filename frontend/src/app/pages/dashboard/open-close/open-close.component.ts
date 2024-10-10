import { ChangeDetectorRef, Component, effect, Signal } from "@angular/core";
import { OpenCloseProductsPage } from "./open-close-products/open-close-products.page";
import { OpenCloseFinancialPage } from "./open-close-financial/open-close-financial.page";
import {
  MergedDailyFInancialWithAccount,
  OpenClose,
} from "../../../../types/main";
import { OpenCloseStateService } from "../../../services/open-close-state.service";

@Component({
  selector: "app-open-close",
  standalone: true,
  imports: [OpenCloseProductsPage, OpenCloseFinancialPage],
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

  constructor(
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
    console.log("Received financial data:", data);
  }
}
