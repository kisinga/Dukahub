import { TestBed } from '@angular/core/testing';

import { OpenCloseStateService } from './open-close-state.service';

describe('OpenCloseStateService', () => {
  let service: OpenCloseStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OpenCloseStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
