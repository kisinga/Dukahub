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
  BatchOperationType,
  DbOperation
} from "../../../../types/main";
import { Collections, DailyAccountsRecord, DailyStockTakesRecord, OpenCloseDetailsStatusOptions } from "../../../../types/pocketbase-types";
import { BatchService, DbService } from "../../../services/db.service";
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
  openCloseState: Signal<OpenCloseDetailsStatusOptions>;
  customStrings = {
    bannerMessage: "",
    header: "",
    actionLabel: "",
  };

  activePage = 1;
  accountBalances: DailyAccountsRecord[] = [];
  dailyStockRecords: DailyStockTakesRecord[] = [];
  @ViewChild(OpenCloseFinancialPage) openCloseFinancialPage!: OpenCloseFinancialPage;
  @ViewChild(OpenCloseProductsPage) openCloseProductsPage!: OpenCloseProductsPage;

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
  onFinancialDataReceived(data: DailyAccountsRecord[]) {
    this.accountBalances = data;
    console.log("financial data received::", data);
  }

  onProductDataReceived(data: DailyStockTakesRecord[]) {
    this.dailyStockRecords = data;
    console.log("product data received::", data);
  }

  nextStep() {
    if (this.activePage == 1) {
      this.openCloseFinancialPage.onSubmit();
    } else {
      this.openCloseProductsPage.onSubmit();
      this.submitAllData();
    }
    this.activePage++;
  }

  previousStep() {
    if (this.activePage > 1) {
      this.activePage--;
    }
  }
  async submitAllData() {
    console.log(this.accountBalances);
    console.log(this.dailyStockRecords);

    const batchOp: BatchService = await this.db.execute(Collections.DailyAccounts, {
      operation: DbOperation.batch_service,
    }) as BatchService


    this.accountBalances.forEach((account) => {
      batchOp.add(
        {
          collection: Collections.DailyAccounts,
          type: BatchOperationType.create,
          data: account
        }
      )
    })

    this.dailyStockRecords.forEach((product) => {
      batchOp.add(
        {
          collection: Collections.DailyStockTakes,
          type: BatchOperationType.create,
          data: product
        }
      )
    })

    batchOp.send()
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
