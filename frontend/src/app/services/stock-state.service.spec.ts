import { TestBed } from '@angular/core/testing';

import { StockStateService } from './stock-state.service';

describe('StockStateService', () => {
  let service: StockStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StockStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
