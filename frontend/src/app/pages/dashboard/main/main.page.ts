import { ChangeDetectionStrategy, ChangeDetectorRef, Component, effect, Inject, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DailyFinancialsRecord } from '../../../../types/pocketbase-types';
import { TruncatePipe } from "../../../pipes/truncate.pipe";
import { AppStateService } from '../../../services/app-state.service';

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
        @Inject(Router) private readonly router: Router,
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
        this.router.navigate(['/dashboard/open-close-financial'], { queryParams: { date: new Date().toISOString().split("T")[0] } });
    }

    navigateToStock() {
        this.router.navigate(['/dashboard/open-close-stock'], { queryParams: { date: new Date().toISOString().split("T")[0] } });
    }

    // calculate total weekly sales
    calculateTotalWeeklySales(weeklySales: DailyFinancialsRecord[]): number {
        console.log('Calculating total weekly sales');
        let totalClosingBalances = weeklySales.reduce((acc, curr) => acc + (curr.closing_bal ?? 0), 0);
        let totalOpeningBalances = weeklySales.reduce((acc, curr) => acc + (curr.opening_bal ?? 0), 0);
        return totalClosingBalances - totalOpeningBalances;
    }

}
