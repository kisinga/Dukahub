import { ChangeDetectionStrategy, ChangeDetectorRef, Component, effect, Inject, signal, Signal, type OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FileOptions } from 'pocketbase';
import { CompaniesResponse, UsersResponse } from '../../../types/pocketbase-types';
import { TruncatePipe } from "../../pipes/truncate.pipe";
import { AppStateService } from '../../services/app-state.service';
import { DbService } from '../../services/db.service';

@Component({
    standalone: true,
    imports: [
        RouterLink,
        RouterOutlet,
        FormsModule,
        ReactiveFormsModule,
        RouterLinkActive,
        TruncatePipe
    ],
    templateUrl: './dashboard.page.html',
    styleUrl: './dashboard.page.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit {
    loadingUser: Signal<boolean>;
    selectedCompanyIndex: Signal<number>;
    companies: Signal<CompaniesResponse[]>;
    user: UsersResponse & { avatarURL?: string } | undefined;
    selectedDate: Signal<Date>
    dateString = "";

    showDatePicker = signal<boolean>(false);

    constructor(@Inject(AppStateService) private readonly stateService: AppStateService,
        @Inject(DbService) private readonly db: DbService,
        @Inject(Router) private readonly router: Router,
        private cdr: ChangeDetectorRef,
        private activatedRoute: ActivatedRoute) {
        this.loadingUser = this.stateService.loadingUser;
        this.selectedCompanyIndex = this.stateService.selectedCompanyIndex
        this.companies = this.stateService.companies
        this.selectedDate = this.stateService.selectedDate

        effect(() => {
            if (this.stateService.user()) {
                this.user = this.stateService.user()!!
                this.user.avatarURL = this.getAvatarURL()
                this.cdr.detectChanges(); // Trigger change detection
            }
        })

        effect(() => {
            this.dateString = this.formatDate(this.stateService.selectedDate())
        })

        // show datepicker depending on route
        this.activatedRoute.queryParams.subscribe((params: { [x: string]: string | number | Date; }) => {
            if (params['date']) {
                this.stateService.selectedDate.set(new Date(params['date']))
                this.toggleDatePicker(true)
            } else {
                this.showDatePicker.set(false)
            }
        })
    }

    updateDate(dateString: string): void {
        // check the currently active route
        this.router.navigate([], { queryParams: { date: dateString } });
    }

    private formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    toggleDatePicker(value?: boolean): void {
        this.showDatePicker.set(value === undefined ? !this.showDatePicker() : value)
    }

    getAvatarURL(): string {
        if (this.user && this.user!!.avatar) {
            return this.db.generateURL(this.user!!, this.user!!.avatar);
        } else {
            return 'https://images.unsplash.com/photo-1676195470090-7c90bf539b3b?q=80&w=3072&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
        }
    }

    generateURL(record: {
        [key: string]: any;
    }, filename: string, queryParams?: FileOptions): string {
        return this.db.generateURL(record, filename);
    }

    logout(): void {
        this.db.logout();
        this.router.navigate(['/login']);
    }

    onCompanyChange() {
        if (this.selectedCompanyIndex() !== -1) {
            this.stateService.changeSelectedCompany(this.selectedCompanyIndex())
        }
    }
    ngOnInit(): void {


    }
}
