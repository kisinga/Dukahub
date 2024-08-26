import { ChangeDetectionStrategy, ChangeDetectorRef, Component, effect, Inject, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DailyFinancialsRecord } from '../../../../types/pocketbase-types';
import { TruncatePipe } from "../../../pipes/truncate.pipe";
import { AppStateService } from '../../../services/app-state.service';
import { DynamicUrlService } from '../../../services/dynamic-url.service';

@Component({
    standalone: true,
    imports: [TruncatePipe, FormsModule],
    templateUrl: './main.page.html',
    styleUrl: './main.page.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainPage {
    weeklySales: Signal<DailyFinancialsRecord[]>;
    totalWeeklySales = 0

    totalSalesToday = 0


    constructor(
        @Inject(AppStateService) private readonly stateService: AppStateService,
        @Inject(DynamicUrlService) private readonly dynamicUrlService: DynamicUrlService,
        private cdr: ChangeDetectorRef
    ) {
        this.weeklySales = this.stateService.weeklySales

        effect(() => {
            this.totalWeeklySales = this.calculateTotalWeeklySales(this.stateService.weeklySales())
            // get total sales for today where each day has several opening and closing balances
            this.cdr.detectChanges(); // Trigger change detection 
        })
    }



    navigateToFinancial() {
        this.dynamicUrlService.navigateDashboardUrl('open-close-financial', new Date().toISOString().split('T')[0], this.stateService.selectedCompany()!.id);
    }

    navigateToStock() {
        this.dynamicUrlService.navigateDashboardUrl('open-close-stock', new Date().toISOString().split('T')[0], this.stateService.selectedCompany()!.id);
    }

    // calculate total weekly sales
    calculateTotalWeeklySales(weeklySales: DailyFinancialsRecord[]): number {
        console.log('Calculating total weekly sales');
        let totalClosingBalances = weeklySales.reduce((acc, curr) => acc + (curr.closing_bal ?? 0), 0);
        let totalOpeningBalances = weeklySales.reduce((acc, curr) => acc + (curr.opening_bal ?? 0), 0);
        return totalClosingBalances - totalOpeningBalances;
    }

}
