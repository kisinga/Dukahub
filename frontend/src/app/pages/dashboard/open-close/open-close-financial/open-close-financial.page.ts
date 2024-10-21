import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Inject,
  Output,
  Signal,
  type OnInit
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  AccountBalances,
  MergedAccountWithType,
} from "../../../../../types/main";
import {
  AccountTypesRecord
} from "../../../../../types/pocketbase-types";
import { CustomInputComponent } from "../../../../components/custom-input/custom-input.component";
import { TruncatePipe } from "../../../../pipes/truncate.pipe";
import { DbService } from "../../../../services/db.service";
import { FinancialStateService } from "../../../../services/financial-state.service";
import { ToastService } from "../../../../services/toast.service";

@Component({
  standalone: true,
  selector: "open-close-financial-page",
  imports: [TruncatePipe, CommonModule, FormsModule, CustomInputComponent],
  templateUrl: "./open-close-financial.page.html",
  styleUrl: "./open-close-financial.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenCloseFinancialPage implements OnInit {
  @Output() accountBalances = new EventEmitter<AccountBalances>();

  localaccountBalances: AccountBalances = {};
  currentPage = 1;

  mergedCompanyAccounts: Signal<MergedAccountWithType[]>;

  constructor(
    private cdr: ChangeDetectorRef,
    @Inject(ToastService) private readonly toastService: ToastService,
    @Inject(DbService) private readonly db: DbService,
    @Inject(FinancialStateService)
    private readonly financialStateService: FinancialStateService,
  ) {
    this.mergedCompanyAccounts =
      this.financialStateService.mergedCompanyAccounts;
  }

  generateImageURL(account: AccountTypesRecord, iconID: number): string {
    return this.db.generateURL(account, account.icons[iconID]);
  }

  async onSubmit(): Promise<void> {
    console.log("Submitting financial data");
    this.accountBalances.emit(this.localaccountBalances);
  }


  ngOnInit(): void { }
}
