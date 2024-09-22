import { Inject, Injectable, signal } from "@angular/core";
import { AppStateService } from "./app-state.service";
import { OpenClose } from "../../types/main";

@Injectable({
  providedIn: "root",
})
export class OpenCloseStateService {
  openCloseState = signal<OpenClose>("closed");

  constructor(
    @Inject(AppStateService) private readonly stateService: AppStateService,
  ) {}
}
