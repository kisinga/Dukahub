import { AccountTypesResponse, AccountsResponse, DailyFinancialsResponse } from "./pocketbase-types";


export type MergedAccountWithType = AccountsResponse & { accountType: AccountTypesResponse };
export type MergedDailyeFInancialWithAccount = DailyFinancialsResponse & { relatedMergedAccountWithType: MergedAccountWithType };