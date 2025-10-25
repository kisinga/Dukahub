/**
 * Component tests for Dashboard Layout
 */

import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CompanyService } from '../../core/services/company.service';
import { DashboardLayoutComponent } from './dashboard-layout.component';

describe('DashboardLayoutComponent', () => {
    let component: DashboardLayoutComponent;
    let fixture: ComponentFixture<DashboardLayoutComponent>;
    let mockCompanyService: jasmine.SpyObj<CompanyService>;
    let mockAuthService: jasmine.SpyObj<AuthService>;

    beforeEach(async () => {
        const companySpy = jasmine.createSpyObj('CompanyService', [], {
            activeCompany: signal(null),
            companyLogoUrl: signal(null)
        });

        const authSpy = jasmine.createSpyObj('AuthService', ['logout'], {
            isAuthenticated: signal(true),
            currentUser: signal({ id: 'user-1', email: 'test@example.com' })
        });

        await TestBed.configureTestingModule({
            imports: [DashboardLayoutComponent],
            providers: [
                provideZonelessChangeDetection(),
                provideRouter([]), // Provide empty router for testing
                { provide: CompanyService, useValue: companySpy },
                { provide: AuthService, useValue: authSpy }
            ]
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