import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  EventEmitter,
  Inject,
  Output,
  Signal,
  signal,
  type OnInit
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  MergedAccountWithType
} from "../../../../../types/main";
import {
  AccountTypesRecord,
  DailyAccountsRecord,
  OpenCloseDetailsStatusOptions
} from "../../../../../types/pocketbase-types";
import { TruncatePipe } from "../../../../pipes/truncate.pipe";
import { AppStateService } from "../../../../services/app-state.service";
import { DbService } from "../../../../services/db.service";
import { FinancialStateService } from "../../../../services/financial-state.service";
import { OpenCloseStateService } from "../../../../services/open-close-state.service";
import { ToastService } from "../../../../services/toast.service";

@Component({
  standalone: true,
  selector: "open-close-financial-page",
  imports: [TruncatePipe, CommonModule, FormsModule],
  templateUrl: "./open-close-financial.page.html",
  styleUrl: "./open-close-financial.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenCloseFinancialPage implements OnInit {
  @Output() accountBalances = new EventEmitter<DailyAccountsRecord[]>();

  localaccountBalances: DailyAccountsRecord[] = [];
  currentPage = 1;

  mergedCompanyAccounts = signal<MergedAccountWithType[]>([]);
  openCloseState: Signal<OpenCloseDetailsStatusOptions>;

  constructor(
    private cdr: ChangeDetectorRef,
    @Inject(ToastService) private readonly toastService: ToastService,
    @Inject(DbService) private readonly db: DbService,
    @Inject(FinancialStateService) private readonly financialStateService: FinancialStateService,
    @Inject(AppStateService) private readonly stateService: AppStateService,
    @Inject(OpenCloseStateService) private readonly openCloseStateService: OpenCloseStateService,
  ) {

    this.openCloseState = this.openCloseStateService.openCloseState;



    effect(() => {
      const accounts = this.financialStateService.mergedCompanyAccounts();
      accounts.forEach(account => {
        this.localaccountBalances.push(
          {
            account: account.id,
            company: account.company,
            opening_bal: 0,
            closing_bal: 0,
            notes: "",
            user: this.stateService.user()?.id!!,
            date: new Date().toISOString(),
            id: ""
          }
        )
      })

      this.mergedCompanyAccounts.set(accounts)
    }, { allowSignalWrites: true })


  }

  generateImageURL(account: AccountTypesRecord, iconID: number): string {
    return this.db.generateURL(account, account.icons[iconID]);
  }

  async onSubmit() {
    this.accountBalances.emit(this.localaccountBalances);
  }


  ngOnInit(): void { }
}
