import { Inject, Injectable, signal } from "@angular/core";
import { OpenCloseDetailsStatusOptions } from "../../types/pocketbase-types";
import { AppStateService } from "./app-state.service";

@Injectable({
  providedIn: "root",
})
export class OpenCloseStateService {
  openCloseState = signal<OpenCloseDetailsStatusOptions>(OpenCloseDetailsStatusOptions.closed);

  constructor(
    @Inject(AppStateService) private readonly stateService: AppStateService,
  ) { }
}
