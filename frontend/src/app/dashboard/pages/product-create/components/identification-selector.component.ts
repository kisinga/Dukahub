import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BarcodeScannerComponent } from './barcode-scanner.component';
import { PhotoManagerComponent } from './photo-manager.component';

/**
 * Identification Selector Component
 *
 * Handles barcode vs photo identification methods.
 * Embeds photo-manager and barcode-scanner components.
 */
@Component({
  selector: 'app-identification-selector',
  imports: [CommonModule, ReactiveFormsModule, PhotoManagerComponent, BarcodeScannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card bg-base-100 shadow">
      <div class="card-body p-3">
        <h3 class="font-bold text-sm mb-2">Identification</h3>
        <p class="text-xs opacity-60 mb-3">Choose one method to identify this item</p>

        <div class="space-y-2">
          <!-- Barcode Method -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="btn btn-sm flex-1 justify-start"
              [class.btn-primary]="identificationMethod() === 'barcode'"
              (click)="onMethodChange('barcode')"
            >
              Scan barcode
            </button>
            <button type="button" class="btn btn-sm btn-outline" (click)="startBarcodeScanner()">
              Use camera
            </button>
          </div>

          @if (identificationMethod() === 'barcode') {
            <input
              type="text"
              [formControl]="barcodeControl()"
              placeholder="Enter or scan barcode"
              class="input input-bordered w-full input-sm"
            />
          }

          <!-- Photo Method -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="btn btn-sm flex-1 justify-start"
              [class.btn-primary]="identificationMethod() === 'label-photos'"
              (click)="onMethodChange('label-photos')"
            >
              Label photos
            </button>
            <span class="text-xs opacity-60">{{ photoCount() }}/5 photos</span>
          </div>

          @if (identificationMethod() === 'label-photos') {
            <app-photo-manager
              #photoManager
              (photosChanged)="onPhotosChanged($event)"
              class="mt-2"
            />
          }
        </div>

        @if (!hasValidIdentification()) {
          <div class="bg-warning/10 p-2 rounded text-xs mt-2">
            Add a barcode or at least 5 label photos to continue. You can add more photos later in
            edit.
          </div>
        }
      </div>
    </div>

    <!-- Hidden barcode scanner -->
    <div class="hidden">
      <app-barcode-scanner #barcodeScanner (barcodeScanned)="onBarcodeScanned($event)" />
    </div>
  `,
})
export class IdentificationSelectorComponent {
  // View references
  readonly photoManager = viewChild<PhotoManagerComponent>('photoManager');
  readonly barcodeScanner = viewChild<BarcodeScannerComponent>('barcodeScanner');

  // Inputs
  readonly identificationMethod = input.required<'barcode' | 'label-photos' | null>();
  readonly barcodeControl = input.required<FormControl>();
  readonly photoCount = input.required<number>();
  readonly hasValidIdentification = input.required<boolean>();

  // Outputs
  readonly methodChange = output<'barcode' | 'label-photos'>();
  readonly barcodeScanned = output<string>();
  readonly photosChanged = output<File[]>();

  /**
   * Handle identification method change
   */
  onMethodChange(method: 'barcode' | 'label-photos'): void {
    this.methodChange.emit(method);
  }

  /**
   * Handle barcode scanned
   */
  onBarcodeScanned(barcode: string): void {
    this.barcodeScanned.emit(barcode);
  }

  /**
   * Handle photos changed
   */
  onPhotosChanged(photos: File[]): void {
    this.photosChanged.emit(photos);
  }

  /**
   * Start barcode scanner
   */
  async startBarcodeScanner(): Promise<void> {
    const scanner = this.barcodeScanner();
    if (scanner) {
      this.onMethodChange('barcode');
      await scanner.startScanning();
    }
  }
}
