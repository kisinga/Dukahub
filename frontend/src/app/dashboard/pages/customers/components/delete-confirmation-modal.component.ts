import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';

export interface DeleteConfirmationData {
  customerName: string;
  addressCount: number;
}

@Component({
  selector: 'app-delete-confirmation-modal',
  imports: [CommonModule],
  templateUrl: './delete-confirmation-modal.component.html',
  styleUrl: './delete-confirmation-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteConfirmationModalComponent {
  @Input({ required: true }) data!: DeleteConfirmationData;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly isVisible = signal(false);

  show(): void {
    this.isVisible.set(true);
  }

  hide(): void {
    this.isVisible.set(false);
  }

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  get visible(): boolean {
    return this.isVisible();
  }
}
