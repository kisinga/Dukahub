import { ChangeDetectionStrategy, ChangeDetectorRef, Component, effect, Inject, type OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DbService } from '../../../services/db.service';
import { CompaniesRecord, CompaniesResponse, DailyFinancialsRecord, UsersRecord, UsersResponse } from '../../../../types/pocketbase-types';
import { TruncatePipe } from "../../../pipes/truncate.pipe";
import { FormsModule } from '@angular/forms';
import { AppStateService } from '../../../services/app-state.service';

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

        effect(() => {
            this.user.set(this.stateService.user())
        });

        effect(() => {
            this.weeklySales = this.stateService.weeklySales
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
            this.stateService.changeSelectedCompany(this.selectedCompanyIndex);
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
        let totalClosingBlalances = weeklySales.reduce((acc, curr) => acc + curr.closing_bal, 0);
        let totalOpeningBalances = weeklySales.reduce((acc, curr) => acc + curr.opening_bal, 0);
        return totalClosingBlalances - totalOpeningBalances;
    }

    logout(): void {
        this.db.logout();
        this.router.navigate(['/login']);
    }
}
