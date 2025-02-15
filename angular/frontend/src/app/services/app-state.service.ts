import { computed, effect, Inject, Injectable, signal } from "@angular/core";
import { DbOperation } from "../../types/main";
import {
  AdminsResponse,
  Collections,
  CompaniesResponse,
  DailyAccountsResponse
} from "../../types/pocketbase-types";
import { DbService } from "./db.service";
import { DynamicUrlService } from "./dynamic-url.service";

@Injectable({
  providedIn: "root",
})
export class AppStateService {
  userCompanies = signal<CompaniesResponse[]>([]);
  selectedCompanyIndex = signal<number>(-1);

  selectedCompany = computed(() => {
    if (this.selectedCompanyIndex() > -1) {
      return this.userCompanies()[this.selectedCompanyIndex()];
    } else {
      return undefined;
    }
  });
  urlCompany = signal<string>("");

  weeklySales = signal<DailyAccountsResponse[]>([]);
  user = signal<AdminsResponse | undefined>(undefined);
  loadingUser = signal<boolean>(true);

  readonly isAuthenticated = computed(() => !!this.user());

  constructor(
    @Inject(DbService) private readonly db: DbService,
    @Inject(DynamicUrlService)
    private readonly dynamicUrlService: DynamicUrlService,
  ) {
    effect(() => {
      if (this.isAuthenticated()) {
        this.setup();
      }
    });
    effect(() => {
      if (this.selectedCompany()) {
        this.fetchWeeklySales(this.selectedCompany()?.id!!).then(
          (weeklySales) => {
            this.weeklySales.set(weeklySales);
          },
        );
      }
    });
  }

  setUser(user: AdminsResponse) {
    this.user.set(user);
    this.loadingUser.set(false);
  }

  setup() {
    console.log("Setting up");

    this.db.execute<CompaniesResponse>(Collections.Companies, {
      operation: DbOperation.list_search,
    }).then((response) => {
      if (!Array.isArray(response)) {
        console.log("Invalid response")
        return
      }

      this.userCompanies.set(response);
      if (this.user()) {
        if (this.urlCompany() !== "") {
          // make sure the company exists in the list of companies
          let co = response.find((c) => c.id === this.urlCompany());
          if (co) {
            this.selectedCompanyIndex.set(
              response.findIndex((c) => c.id === this.urlCompany()),
            );
          } else {
            console.log("provided Company not found");
            this.selectedCompanyIndex.set(
              response.findIndex((c) => c.id === this.user()!!.defaultCompany),
            );
          }
        } else {
          this.selectedCompanyIndex.set(
            response.findIndex((c) => c.id === this.user()!!.defaultCompany),
          );
        }
      }
    });
  }

  async changeSelectedCompany(index: number) {
    this.selectedCompanyIndex.set(index);
  }

  fetchWeeklySales(
    companyID: string,
  ): Promise<DailyAccountsResponse[]> {
    // use the date today to fetch independent sales arrays for the week
    // the week starts on a Monday
    let today = new Date();
    let day = today.getDay();
    let diff = today.getDate() - day + (day == 0 ? -6 : 1);
    let mondayUTC = new Date(today.setDate(diff)).toISOString();
    let sundayUTC = new Date(today.setDate(diff + 6)).toISOString();
    // console.log('mondayUTC', mondayUTC);
    // console.log('sundayUTC', sundayUTC);
    let options = {
      filter: `created >= "${mondayUTC}"
      && created <= "${sundayUTC}"
      && company = "${companyID}"`,
    };
    return this.db.execute<DailyAccountsResponse>(Collections.DailyAccounts, {
      operation: DbOperation.list_search,
      options: options
    }).then(sales => {
      if (Array.isArray(sales)) {
        return sales;
      } else {
        console.log("Invalid response:", sales)
        return []
      }
    })

  }
}
