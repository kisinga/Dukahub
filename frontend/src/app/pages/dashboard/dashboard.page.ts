import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  ElementRef,
  Inject,
  Signal,
  ViewChild,
  type OnInit
} from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";
import { FileOptions } from "pocketbase";
import { OpenClose } from "../../../types/main";
import {
  AdminsResponse,
  CompaniesResponse
} from "../../../types/pocketbase-types";
import { AppStateService } from "../../services/app-state.service";
import { DbService } from "../../services/db.service";
import { OpenCloseStateService } from "../../services/open-close-state.service";

@Component({
  standalone: true,
  imports: [
    RouterLink,
    RouterOutlet,
    FormsModule,
    ReactiveFormsModule,
    RouterLinkActive
  ],
  templateUrl: "./dashboard.page.html",
  styleUrl: "./dashboard.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit {
  loadingUser: Signal<boolean>;
  selectedCompanyIndex: Signal<number>;
  companies: Signal<CompaniesResponse[]>;
  user: (AdminsResponse & { avatarURL?: string }) | undefined;
  dateString = "";
  openCloseState: Signal<OpenClose>;
  @ViewChild("dropdownContainer") dropdownContainer!: ElementRef;

  constructor(
    @Inject(AppStateService) private readonly stateService: AppStateService,
    @Inject(DbService) private readonly db: DbService,
    @Inject(Router) private readonly router: Router,
    @Inject(OpenCloseStateService)
    private readonly openCloseStateService: OpenCloseStateService,
    private cdr: ChangeDetectorRef,
    private activatedRoute: ActivatedRoute,
  ) {
    this.loadingUser = this.stateService.loadingUser;
    this.selectedCompanyIndex = this.stateService.selectedCompanyIndex;
    this.companies = this.stateService.userCompanies;
    this.openCloseState = this.openCloseStateService.openCloseState;

    effect(() => {
      if (this.stateService.user()) {
        this.user = this.stateService.user()!!;
        this.user.avatarURL = this.getAvatarURL();
        this.cdr.detectChanges(); // Trigger change detection
      }
    });
  }

  updateDate(dateString: string): void {
    // check the currently active route
    this.router.navigate([], { queryParams: { date: dateString } });
  }

  getAvatarURL(): string {
    if (this.user && this.user!!.avatar) {
      return this.db.generateURL(this.user!!, this.user!!.avatar);
    } else {
      return "https://images.unsplash.com/photo-1676195470090-7c90bf539b3b?q=80&w=3072&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
    }
  }

  generateURL(
    record: {
      [key: string]: any;
    },
    filename: string,
    queryParams?: FileOptions,
  ): string {
    return this.db.generateURL(record, filename);
  }

  logout(): void {
    this.db.logout();
    this.router.navigate(["/login"]);
  }

  onCompanyChange(companyIndex: number) {
    console.log(companyIndex);
    if (companyIndex !== -1) {
      this.stateService.changeSelectedCompany(companyIndex);
    }
    this.closeDropdown();
  }

  closeDropdown(): void {
    const dropdownElement =
      this.dropdownContainer.nativeElement.querySelector("details");
    if (dropdownElement) {
      dropdownElement.removeAttribute("open");
    }
  }
  ngOnInit(): void { }
}
