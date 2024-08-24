import { TestBed } from '@angular/core/testing';

import { LocalStateService } from './local-state.service';

describe('LocalStateService', () => {
  let service: LocalStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocalStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
