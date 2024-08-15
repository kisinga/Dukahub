import { ChangeDetectionStrategy, Component, Inject, type OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DbService } from '../../../services/db.service';
import { CompaniesRecord, CompaniesResponse, UsersRecord, UsersResponse } from '../../../../types/pocketbase-types';
import { TruncatePipe } from "../../../pipes/truncate.pipe";
import { FormsModule } from '@angular/forms';

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

    selectedCompanyIndex: number = -1;

    constructor(
        @Inject(DbService) private readonly db: DbService,
        @Inject(Router) private readonly router: Router,
    ) {
        this.user = this.db.user
        this.companies = this.db.companies
    }

    ngOnInit(): void {
        this.selectedCompanyIndex = this.db.selectedCompanyIndex()
    }

    onCompanyChange() {
        if (this.selectedCompanyIndex !== -1) {
            this.db.changeSelectedCompany(this.selectedCompanyIndex);
        }
    }

    generateURL(company: CompaniesRecord, name: string): string {
        return this.db.generateURL(company, name);
    }



    logout(): void {
        this.db.logout();
        this.router.navigate(['/login']);
    }
}
