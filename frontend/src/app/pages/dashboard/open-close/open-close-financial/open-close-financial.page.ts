import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, signal, Signal, type OnInit } from '@angular/core';
import { FinancialTableData, TableColumn } from '../../../../../types/main';
import { FiancialStateService } from '../../../../services/financial-state.service';
import { OpenCloseTableComponent } from '../../open-close-table/open-close-table.component';

@Component({
    standalone: true,
    imports: [OpenCloseTableComponent],
    templateUrl: './open-close-financial.page.html',
    styleUrl: './open-close-financial.page.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})

export class OpenCloseFinancialPage implements OnInit {

    financialTableData: Signal<FinancialTableData[]>
    loadingFinancials = signal<boolean>(false);

    columns: TableColumn[] = [
        { key: 'account', label: `Accounts`, type: 'image' },
        { key: 'openingBal', label: 'Opening Bal', type: 'editable' },
        { key: 'closingBal', label: 'Closing Bal', type: 'editable' }
    ];

    constructor(
        private cdr: ChangeDetectorRef,
        @Inject(FiancialStateService) private readonly financialStateService: FiancialStateService,
    ) {
        this.financialTableData = this.financialStateService.financialTableData
        this.loadingFinancials = this.financialStateService.loadingFinancials

    }




    async onSave(updatedData: any[]): Promise<void> {
        this.financialStateService.savingFinancials.set(true)

        let data: FinancialTableData[] = updatedData.map(d => {
            let newData: FinancialTableData = d as FinancialTableData
            newData.openingBal = parseFloat(newData.openingBal.toString())
            newData.closingBal = parseFloat(newData.closingBal.toString())
            return newData
        });
        // aggregate all the changes made to existing records by filtering out records with existingRecordID
        let updatedRecords = data.filter(d => d.existingRecordID)

        // aggregate all the new records by filtering out records without existingRecordID
        let newRecords = data.filter(d => !d.existingRecordID)

        // update the existing records
        await this.financialStateService.updateRecords(updatedRecords)
        // create new records for records without existingRecordID
        await this.financialStateService.createRecords(newRecords)

        this.financialStateService.savingFinancials.set(true)

    }

    ngOnInit(): void {
    }

}


