import { AccountNamesResponse, AccountsResponse, DailyFinancialsResponse } from "./pocketbase-types";


export type MergedAccountWithType = AccountsResponse & { accountType: AccountNamesResponse };
export type MergedDailyeFInancialWithAccount = DailyFinancialsResponse & { relatedMergedAccountWithType: MergedAccountWithType };