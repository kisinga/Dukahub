import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, effect, Inject, signal, type OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MergedDailyFInancialWithAccount } from '../../../../../types/main';
import { Collections, DailyFinancialsResponse } from '../../../../../types/pocketbase-types';
import { TruncatePipe } from "../../../../pipes/truncate.pipe";
import { AppStateService } from '../../../../services/app-state.service';
import { DbService } from '../../../../services/db.service';
import { DynamicUrlService } from '../../../../services/dynamic-url.service';
import { ToastService } from '../../../../services/toast.service';

type MergedDailyFInancialWithAccountIcon = MergedDailyFInancialWithAccount & { iconURL: string }

@Component({
    standalone: true,
    imports: [TruncatePipe, CommonModule, FormsModule],
    templateUrl: './open-close-financial.page.html',
    styleUrl: './open-close-financial.page.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})


export class OpenCloseFinancialPage implements OnInit {

    financialTableData: MergedDailyFInancialWithAccountIcon[] = [];

    loadingFinancials = signal<boolean>(false);
    savingFinancials = signal<boolean>(false);

    itemsPerPage = 10;
    currentPage = 1;


    constructor(
        private cdr: ChangeDetectorRef,
        @Inject(ToastService) private readonly toastService: ToastService,
        @Inject(DbService) private readonly db: DbService,
        @Inject(AppStateService) private readonly stateService: AppStateService,
        @Inject(DynamicUrlService) private readonly dynamicUrlService: DynamicUrlService

    ) {

        // this.loadingFinancials.set(true)

        effect(async () => {
            if (
                this.stateService.selectedCompanyAccounts().length > 0 &&
                this.stateService.selectedDate() !== null) {

                // change the url segment whenver the selected company and date change
                this.dynamicUrlService.updateDashboardUrl("open-close-financial", this.stateService.selectedDateUTC(), this.stateService.selectedCompany()!.id);

                await this.initData()
            }
        })

    }

    async initData(): Promise<void> {

        let queryOption = {
            filter: `date ?~ "${this.stateService.selectedDateUTC()}" && company = "${this.stateService.selectedCompany()?.id!!}"`
        }

        let financialRecords = await this.db.fetchDailyFinancialRecords(queryOption)

        this.financialTableData = financialRecords.map(record => {
            let relatedAccount = this.stateService.selectedCompanyAccounts().find(account => account.id === record.account)
            if (!relatedAccount) {
                throw new Error(`Account not found for record ${record.id}`)
            }
            return {
                ...record,
                relatedMergedAccountWithType: relatedAccount,
                iconURL: this.db.generateURL(relatedAccount.accountType, relatedAccount.accountType.icons[relatedAccount.icon_id])
            }
        })

        // make sure that a table item is populated fofr each account
        this.stateService.selectedCompanyAccounts().forEach(account => {
            let existingRecord = financialRecords.find(record => record.account === account.id)
            if (!existingRecord) {
                this.financialTableData.push(
                    {
                        relatedMergedAccountWithType: account,
                        account: account.id,
                        company: this.stateService.selectedCompany()?.id!!,
                        date: this.stateService.selectedDateUTC(),
                        opening_bal: 0,
                        closing_bal: 0,
                        notes: '',
                        user: this.stateService.user()?.id!!,
                        updated: "",
                        collectionId: "",
                        collectionName: Collections.DailyFinancials,
                        id: "",
                        created: "",
                        iconURL: this.db.generateURL(account.accountType, account.accountType.icons[account.icon_id])
                    }
                )
            }
        })
        console.log('Financial Records:', this.financialTableData);
        this.cdr.detectChanges()
    }

    get paginatedData(): MergedDailyFInancialWithAccountIcon[] {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        return this.financialTableData.slice(start, start + this.itemsPerPage);
    }

    getPages(): number[] {
        const pageCount = Math.ceil(this.financialTableData.length / this.itemsPerPage);
        return Array.from({ length: pageCount }, (_, i) => i + 1);
    }

    setPage(page: number): void {
        this.currentPage = page;
    }


    async onSave(): Promise<void> {
        this.savingFinancials.set(true)

        let newRecords: DailyFinancialsResponse[] = []
        let existingRecords: DailyFinancialsResponse[] = []

        this.financialTableData
            .filter(d => d.opening_bal || d.closing_bal)
            .map(d => {
                let newData: DailyFinancialsResponse = d
                newData.opening_bal = parseFloat(newData.opening_bal.toString())
                newData.closing_bal = parseFloat(newData.closing_bal.toString())

                if (d.id !== '') {
                    existingRecords.push(newData)
                } else {
                    newRecords.push(newData)
                }

                return newData
            })

        // update the existing records
        await Promise.all(existingRecords.map(record => {
            return this.db.updateDailyFinancialRecord(record.id, record)
        }))
        // create new records for records without existingRecordID
        await Promise.all(newRecords.map(record => {
            return this.db.createDailyFinancialRecord(record)
        }))

        this.savingFinancials.set(false)

        this.toastService.show('Financial records saved successfully')

    }

    ngOnInit(): void {
    }

}


