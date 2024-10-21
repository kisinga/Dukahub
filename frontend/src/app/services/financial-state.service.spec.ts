import { TestBed } from '@angular/core/testing';

import { FinancialStateService } from './financial-state.service';

describe('FinancialStateService', () => {
  let service: FinancialStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FinancialStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
