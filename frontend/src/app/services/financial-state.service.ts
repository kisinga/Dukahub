import {
  computed,
  Inject,
  Injectable,
  Signal,
  signal
} from "@angular/core";
import { MergedAccountWithType } from "../../types/main";
import {
  AccountsResponse,
  AccountTypesResponse,
  CompaniesResponse,
} from "../../types/pocketbase-types";
import { AppStateService } from "./app-state.service";
import { DbService } from "./db.service";

@Injectable({
  providedIn: "root",
})
export class FinancialStateService {
  private allGeneralAccountNames = signal<AccountTypesResponse[]>([]);
  private allPlainCompanyAccounts = signal<AccountsResponse[]>([]);

  private allMergedCompanyAccounts = computed<MergedAccountWithType[]>(() => {
    return this.allPlainCompanyAccounts().map((account) => {
      let relatedAccount = this.allGeneralAccountNames().find(
        (name) => name.id === account.type,
      );

      if (!relatedAccount) {
        throw new Error(`Account not found for record ${account.id}`);
      }
      return {
        ...account,
        accountType: relatedAccount,
      };
    });
  });
  private selectedCompany: Signal<CompaniesResponse | undefined>;

  mergedCompanyAccounts = computed(() => {
    return this.allMergedCompanyAccounts().filter(
      (account) => account.company === this.selectedCompany()?.id,
    );
  });
  constructor(
    @Inject(AppStateService) private readonly stateService: AppStateService,
    @Inject(DbService) private readonly db: DbService,
  ) {
    this.db.fetchAccountTypes().then((accountNames) => {
      this.allGeneralAccountNames.set(accountNames);
      if (this.stateService.selectedCompany()) {
        this.initData();
      }
    });

    this.selectedCompany = this.stateService.selectedCompany;
  }

  initData() {
    let queryOptions = {
      filter: `company = "${this.selectedCompany()?.id}"`,
    };

    this.db.fetchAccounts(queryOptions).then((accounts) => {
      this.allPlainCompanyAccounts.set(accounts);
    });
  }
}
