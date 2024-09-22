import { Inject, Injectable } from "@angular/core";
import { AppStateService } from "./app-state.service";

@Injectable({
  providedIn: "root",
})
export class OpenCloseStateService {
  constructor(
    @Inject(AppStateService) private readonly stateService: AppStateService,
  ) {}
}
