/**
 * Component tests for Dashboard Layout
 */

import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CompanyService } from '../../core/services/company.service';
import { AppInitService } from '../../core/services/app-init.service';
import { NotificationService } from '../../core/services/notification.service';
import { StockLocationService } from '../../core/services/stock-location.service';
import { DashboardLayoutComponent } from './dashboard-layout.component';

class MockNotificationService {
  private readonly notificationsSignal = signal([]);
  private readonly unreadCountSignal = signal(0);

  readonly notifications = this.notificationsSignal.asReadonly();
  readonly unreadCount = this.unreadCountSignal.asReadonly();

  async loadNotifications(): Promise<void> {
    return;
  }

  async loadUnreadCount(): Promise<void> {
    return;
  }

  async markAsRead(): Promise<boolean> {
    return true;
  }

  async markAllAsRead(): Promise<number> {
    this.unreadCountSignal.set(0);
    return 0;
  }

  async subscribeToPush(): Promise<boolean> {
    return true;
  }

  async unsubscribeToPush(): Promise<boolean> {
    return true;
  }

  async requestPushPermission(): Promise<boolean> {
    return true;
  }
}

describe('DashboardLayoutComponent', () => {
  let component: DashboardLayoutComponent;
  let fixture: ComponentFixture<DashboardLayoutComponent>;
  let mockCompanyService: jasmine.SpyObj<CompanyService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    const companySpy = jasmine.createSpyObj('CompanyService', ['activateCompany'], {
      companies: signal([]),
      activeCompanyId: signal(null),
      activeCompany: signal(null),
      companyDisplayName: signal('Test Company'),
      companyLogoAsset: signal(null),
      companyLogoUrl: signal(null),
    });

    const authSpy = jasmine.createSpyObj('AuthService', ['logout', 'hasUpdateSettingsPermission'], {
      isAuthenticated: signal(true),
      user: signal({ id: 'user-1', emailAddress: 'test@example.com' }),
      currentUser: signal({ id: 'user-1', email: 'test@example.com' }),
      fullName: signal('Test User'),
    });
    authSpy.hasUpdateSettingsPermission.and.returnValue(false);

    const stockLocationSpy = jasmine.createSpyObj('StockLocationService', [
      'clearLocations',
      'fetchStockLocationsWithCashier',
    ]);
    const appInitSpy = jasmine.createSpyObj('AppInitService', [
      'initializeDashboard',
      'clearCache',
    ]);

    await TestBed.configureTestingModule({
      imports: [DashboardLayoutComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]), // Provide empty router for testing
        { provide: CompanyService, useValue: companySpy },
        { provide: AuthService, useValue: authSpy },
        { provide: NotificationService, useClass: MockNotificationService },
        { provide: StockLocationService, useValue: stockLocationSpy },
        { provide: AppInitService, useValue: appInitSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardLayoutComponent);
    component = fixture.componentInstance;
    mockCompanyService = TestBed.inject(CompanyService) as jasmine.SpyObj<CompanyService>;
    mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('User Actions', () => {
    it('should call auth service logout method', () => {
      // Act
      component.logout();

      // Assert
      expect(mockAuthService.logout).toHaveBeenCalled();
    });
  });
});
