import { Component } from "@angular/core";
import { OpenCloseProductsPage } from "./open-close-products/open-close-products.page";
import { OpenCloseFinancialPage } from "./open-close-financial/open-close-financial.page";

@Component({
  selector: "app-open-close",
  standalone: true,
  imports: [OpenCloseProductsPage, OpenCloseFinancialPage],
  templateUrl: "./open-close.component.html",
  styleUrl: "./open-close.component.scss",
})
export class OpenCloseComponent {}
