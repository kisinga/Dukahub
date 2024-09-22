import { Inject, Injectable, signal } from "@angular/core";
import { AppStateService } from "./app-state.service";
import { DbService } from "./db.service";
import { DailyFinancialsResponse } from "../../types/pocketbase-types";

@Injectable({
  providedIn: "root",
})
export class DailyFinancialStateService {
  dailyFinancialRecords = signal<DailyFinancialsResponse[]>([]);
  loadingFinancials = signal<boolean>(false);
  savingFinancials = signal<boolean>(false);

  constructor(
    @Inject(AppStateService) private readonly stateService: AppStateService,
    @Inject(DbService) private readonly db: DbService,
  ) {
    this.refreshFinancialRecords();
  }

  private async fetchDailyFinancials() {
    this.loadingFinancials.set(true);
    let queryOption = {
      filter: `date ?~ "${this.stateService.selectedDateUTC()}" && company = "${this.stateService.selectedCompany()?.id!!}"`,
    };
    let records = await this.db.fetchDailyFinancialRecords(queryOption);
    this.dailyFinancialRecords.set(records);
    this.loadingFinancials.set(false);
  }

  async saveDailyFinancials(financials: DailyFinancialsResponse[]) {
    this.savingFinancials.set(true);

    let newRecords: DailyFinancialsResponse[] = [];
    let existingRecords: DailyFinancialsResponse[] = [];

    financials
      .filter((d) => d.opening_bal || d.closing_bal)
      .map((d) => {
        let newData: DailyFinancialsResponse = d;
        newData.opening_bal = parseFloat(newData.opening_bal.toString());
        newData.closing_bal = parseFloat(newData.closing_bal.toString());
        if (d.id !== "") {
          existingRecords.push(newData);
        } else {
          newRecords.push(newData);
        }
        return newData;
      });
    // update the existing records
    await Promise.all(
      existingRecords.map((record) => {
        return this.db.updateDailyFinancialRecord(record.id, record);
      }),
    );
    // create new records for records without existingRecordID
    await Promise.all(
      newRecords.map((record) => {
        return this.db.createDailyFinancialRecord(record);
      }),
    );
    this.savingFinancials.set(false);
  }

  async refreshFinancialRecords() {
    await this.fetchDailyFinancials();
  }
}
