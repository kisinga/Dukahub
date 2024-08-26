import { Inject, Injectable, signal } from '@angular/core';
import { ProductsRecord, SkusResponse } from '../../types/pocketbase-types';
import { AppStateService } from './app-state.service';
import { DbService } from './db.service';

@Injectable({
  providedIn: 'root'
})
export class StockStateService {
  stockItems = signal<ProductsRecord>
  SKUs = signal<SkusResponse>

  constructor(@Inject(AppStateService) private readonly stateService: AppStateService,
    @Inject(DbService) private readonly db: DbService) {

  }
}
