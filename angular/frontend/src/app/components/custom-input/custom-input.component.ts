import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import { FormControl, FormsModule } from "@angular/forms";

@Component({
  selector: "custom-input",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./custom-input.component.html",
  styleUrl: "./custom-input.component.scss",
})
export class CustomInputComponent {
  @Input() label: string = "";
  @Input() type: string = "text";
  @Input() control: FormControl = new FormControl("");
  @Input() id: string = "";

  isFocused: boolean = false;

  onFocus() {
    this.isFocused = true;
  }

  onBlur() {
    this.isFocused = false;
  }
}
