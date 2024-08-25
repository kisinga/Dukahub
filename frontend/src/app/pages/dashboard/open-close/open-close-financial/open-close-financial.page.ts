import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, effect, Inject, signal, Signal, type OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FinancialTableData } from '../../../../../types/main';
import { TruncatePipe } from "../../../../pipes/truncate.pipe";
import { FiancialStateService } from '../../../../services/financial-state.service';
import { ToastService } from '../../../../services/toast.service';

@Component({
    standalone: true,
    imports: [TruncatePipe, CommonModule, FormsModule],
    templateUrl: './open-close-financial.page.html',
    styleUrl: './open-close-financial.page.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})

export class OpenCloseFinancialPage implements OnInit {

    financialTableData: FinancialTableData[] = [];
    loadingFinancials = signal<boolean>(false);

    savingFinancials: Signal<boolean>
    itemsPerPage = 10;
    currentPage = 1;


    constructor(
        private cdr: ChangeDetectorRef,
        @Inject(FiancialStateService) private readonly financialStateService: FiancialStateService,
        @Inject(ToastService) private readonly toastService: ToastService
    ) {
        effect(() => {
            this.financialTableData = this.financialStateService.financialTableData()
            this.cdr.markForCheck()
        })

        this.loadingFinancials = this.financialStateService.loadingFinancials
        this.savingFinancials = this.financialStateService.savingFinancials

    }

    get paginatedData(): FinancialTableData[] {
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

    onFieldUpdate(id: string, key: string, value: any): void {
        // const index = this.data.findIndex(item => item.id === id);
        // if (index !== -1) {
        //   this.data[index] = { ...this.data[index], [key]: value };
        // }
        // If you have any additional logic or API calls, you can keep them here
    }


    async onSave(): Promise<void> {
        this.financialStateService.savingFinancials.set(true)

        let data: FinancialTableData[] = this.financialTableData.map(d => {
            let newData: FinancialTableData = d as FinancialTableData
            newData.openingBal = parseFloat(newData.openingBal.toString())
            newData.closingBal = parseFloat(newData.closingBal.toString())
            return newData
        }).filter(d => d.openingBal || d.closingBal)
        // aggregate all the changes made to existing records by filtering out records with existingRecordID
        let updatedRecords = data.filter(d => d.existingRecordID)

        // aggregate all the new records by filtering out records without existingRecordID
        let newRecords = data.filter(d => !d.existingRecordID)

        // update the existing records
        await this.financialStateService.updateRecords(updatedRecords)
        // create new records for records without existingRecordID
        await this.financialStateService.createRecords(newRecords)

        this.financialStateService.savingFinancials.set(false)

        this.toastService.show('Financial records saved successfully')

    }

    ngOnInit(): void {
    }

}


