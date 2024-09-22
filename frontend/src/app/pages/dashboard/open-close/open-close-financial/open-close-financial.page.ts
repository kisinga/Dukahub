import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  Inject,
  Signal,
  signal,
  type OnInit,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MergedDailyFInancialWithAccount } from "../../../../../types/main";
import {
  Collections,
  DailyFinancialsResponse,
} from "../../../../../types/pocketbase-types";
import { TruncatePipe } from "../../../../pipes/truncate.pipe";
import { AppStateService } from "../../../../services/app-state.service";
import { DbService } from "../../../../services/db.service";
import { DynamicUrlService } from "../../../../services/dynamic-url.service";
import { ToastService } from "../../../../services/toast.service";
import { DailyFinancialStateService } from "../../../../services/daily-financial-state.service";

type MergedDailyFInancialWithAccountIcon = MergedDailyFInancialWithAccount & {
  iconURL: string;
};

@Component({
  standalone: true,
  imports: [TruncatePipe, CommonModule, FormsModule],
  templateUrl: "./open-close-financial.page.html",
  styleUrl: "./open-close-financial.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenCloseFinancialPage implements OnInit {
  financialTableData: MergedDailyFInancialWithAccountIcon[] = [];
  itemsPerPage = 10;
  currentPage = 1;
  loadingFinancials: Signal<boolean>;
  savingFinancials: Signal<boolean>;
  dailyFinancialRecords: DailyFinancialsResponse[] = [];

  constructor(
    private cdr: ChangeDetectorRef,
    @Inject(ToastService) private readonly toastService: ToastService,
    @Inject(DbService) private readonly db: DbService,
    @Inject(AppStateService) private readonly stateService: AppStateService,
    @Inject(DynamicUrlService)
    private readonly dynamicUrlService: DynamicUrlService,
    @Inject(DailyFinancialStateService)
    private readonly dailyFinancialStateService: DailyFinancialStateService,
  ) {
    this.loadingFinancials = this.dailyFinancialStateService.loadingFinancials;
    this.savingFinancials = this.dailyFinancialStateService.savingFinancials;

    effect(async () => {
      if (
        this.stateService.selectedCompanyAccounts().length > 0 &&
        this.stateService.selectedDate() !== null
      ) {
        // change the url segment whenver the selected company and date change
        this.dynamicUrlService.updateDashboardUrl(
          "open-close-financial",
          this.stateService.selectedDateUTC(),
          this.stateService.selectedCompany()!.id,
        );
      }
    });

    effect(() => {
      this.dailyFinancialRecords =
        this.dailyFinancialStateService.dailyFinancialRecords();
      this.initData();
    });
  }

  async initData(): Promise<void> {
    this.financialTableData = this.dailyFinancialRecords.map((record) => {
      let relatedAccount = this.stateService
        .selectedCompanyAccounts()
        .find((account) => account.id === record.account);
      if (!relatedAccount) {
        throw new Error(`Account not found for record ${record.id}`);
      }
      return {
        ...record,
        relatedMergedAccountWithType: relatedAccount,
        iconURL: this.db.generateURL(
          relatedAccount.accountType,
          relatedAccount.accountType.icons[relatedAccount.icon_id],
        ),
      };
    });

    // make sure that a table item is populated fofr each account
    this.stateService.selectedCompanyAccounts().forEach((account) => {
      let existingRecord = this.dailyFinancialRecords.find(
        (record) => record.account === account.id,
      );
      if (!existingRecord) {
        this.financialTableData.push({
          relatedMergedAccountWithType: account,
          account: account.id,
          company: this.stateService.selectedCompany()?.id!!,
          date: this.stateService.selectedDateUTC(),
          expenses: 0,
          opening_bal: 0,
          closing_bal: 0,
          notes: "",
          user: this.stateService.user()?.id!!,
          updated: "",
          collectionId: "",
          collectionName: Collections.DailyFinancials,
          id: "",
          created: "",
          iconURL: this.db.generateURL(
            account.accountType,
            account.accountType.icons[account.icon_id],
          ),
        });
      }
    });
    console.log("Financial Records:", this.financialTableData);
    this.cdr.detectChanges();
  }

  get paginatedData(): MergedDailyFInancialWithAccountIcon[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.financialTableData.slice(start, start + this.itemsPerPage);
  }

  getPages(): number[] {
    const pageCount = Math.ceil(
      this.financialTableData.length / this.itemsPerPage,
    );
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  setPage(page: number): void {
    this.currentPage = page;
  }

  async onSave(): Promise<void> {
    this.dailyFinancialStateService.saveDailyFinancials(
      this.financialTableData,
    );
    this.toastService.show("Financial records saved successfully");
  }

  ngOnInit(): void {}
}
