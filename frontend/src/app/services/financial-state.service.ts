import {
  computed,
  Inject,
  Injectable,
  signal
} from "@angular/core";
import { DbOperation, MergedAccountWithType } from "../../types/main";
import {
  AccountTypesResponse,
  Collections,
  CompanyAccountsResponse
} from "../../types/pocketbase-types";
import { AppStateService } from "./app-state.service";
import { DbService } from "./db.service";

@Injectable({
  providedIn: "root",
})
export class FinancialStateService {
  private allGeneralAccountNames = signal<AccountTypesResponse[]>([]);
  private allPlainCompanyAccounts = signal<CompanyAccountsResponse[]>([]);

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

  mergedCompanyAccounts = computed(() => {
    return this.allMergedCompanyAccounts().filter(
      (account) => account.company === this.stateService.selectedCompany()?.id,
    );
  });
  constructor(
    @Inject(AppStateService) private readonly stateService: AppStateService,
    @Inject(DbService) private readonly db: DbService,
  ) {
    this.refreshData();
  }



  refreshData() {
    this.db.execute<AccountTypesResponse>(Collections.AccountTypes, {
      operation: DbOperation.list_search,
    }).then(result => {
      if (Array.isArray(result)) {
        this.allGeneralAccountNames.set(result);
        if (this.stateService.selectedCompany()) {
          this.initData();
        }
      } else {
        console.log("Invalid response", result)
      }

    })
  }

  initData() {
    let queryOptions = {
      filter: `company = "${this.stateService.selectedCompany()?.id}"`,
    };
    this.db.execute<CompanyAccountsResponse>(Collections.CompanyAccounts, {
      operation: DbOperation.list_search,
      options: queryOptions
    }).then((accounts) => {
      this.allPlainCompanyAccounts.set(accounts as CompanyAccountsResponse[]);
    }).catch(error => {
      console.log(error, queryOptions)
    })
  }
}
