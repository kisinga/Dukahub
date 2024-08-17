import { ChangeDetectionStrategy, ChangeDetectorRef, Component, effect, Inject, type OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CompaniesRecord, CompaniesResponse, DailyFinancialsRecord, UsersResponse } from '../../../../types/pocketbase-types';
import { TruncatePipe } from "../../../pipes/truncate.pipe";
import { AppStateService } from '../../../services/app-state.service';
import { DbService } from '../../../services/db.service';

@Component({
    standalone: true,
    imports: [TruncatePipe, FormsModule],
    templateUrl: './main.page.html',
    styleUrl: './main.page.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainPage implements OnInit {
    companies = signal<CompaniesResponse[]>([]);
    user = signal<UsersResponse | undefined>(undefined);
    weeklySales = signal<DailyFinancialsRecord[]>([]);
    totalWeeklySales = 0

    totalSalesToday = 0

    selectedCompanyIndex: number = -1;

    constructor(
        @Inject(DbService) private readonly db: DbService,
        @Inject(AppStateService) private readonly stateService: AppStateService,
        @Inject(Router) private readonly router: Router,
        private cdr: ChangeDetectorRef
    ) {
        this.companies = this.stateService.companies
        this.weeklySales = this.stateService.weeklySales
        this.user = this.stateService.user
        this.weeklySales = this.stateService.weeklySales

        effect(() => {
            this.totalWeeklySales = this.calculateTotalWeeklySales(this.stateService.weeklySales())
            // get total sales for today where each day has several opening and closing balances
            this.cdr.detectChanges(); // Trigger change detection 
        })
    }

    ngOnInit(): void {
        this.selectedCompanyIndex = this.stateService.selectedCompanyIndex()
    }

    onCompanyChange() {
        if (this.selectedCompanyIndex !== -1) {
            this.stateService.changeSelectedCompany(this.selectedCompanyIndex)
        }
    }

    generateURL(company: CompaniesRecord, name: string): string {
        return this.db.generateURL(company, name);
    }

    navigateToOpenClose() {
        this.router.navigate(['/dashboard/open-close']);
    }

    // calculate total weekly sales
    calculateTotalWeeklySales(weeklySales: DailyFinancialsRecord[]): number {
        console.log('Calculating total weekly sales');
        let totalClosingBalances = weeklySales.reduce((acc, curr) => acc + (curr.closing_bal ?? 0), 0);
        let totalOpeningBalances = weeklySales.reduce((acc, curr) => acc + (curr.opening_bal ?? 0), 0);
        return totalClosingBalances - totalOpeningBalances;
    }

    logout(): void {
        this.db.logout();
        this.router.navigate(['/login']);
    }
}
