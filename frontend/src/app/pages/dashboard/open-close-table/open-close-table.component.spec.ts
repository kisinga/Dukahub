import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpenCloseTableComponent } from './open-close-table.component';

describe('OpenCloseTableComponent', () => {
  let component: OpenCloseTableComponent;
  let fixture: ComponentFixture<OpenCloseTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpenCloseTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpenCloseTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
