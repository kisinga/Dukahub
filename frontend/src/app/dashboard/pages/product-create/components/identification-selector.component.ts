import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
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
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="btn btn-sm flex-1 justify-start"
                [class.btn-primary]="identificationMethod() === 'barcode'"
                (click)="onMethodChange('barcode')"
              >
                Scan barcode
              </button>
            </div>

            @if (identificationMethod() === 'barcode') {
              <div class="space-y-2">
                <!-- Manual input -->
                <input
                  type="text"
                  [formControl]="barcodeControl()"
                  placeholder="Enter barcode manually"
                  class="input input-bordered w-full input-sm"
                />

                <!-- Camera scanner button or scanner view -->
                @if (!isScannerActive()) {
                  <button
                    type="button"
                    class="btn btn-sm btn-outline btn-block gap-2"
                    (click)="startBarcodeScanner()"
                  >
                    <span class="material-symbols-outlined text-base">camera_alt</span>
                    <span>Scan with camera</span>
                  </button>
                } @else {
                  <!-- Inline scanner view -->
                  <div class="border border-base-300 rounded-lg p-2 bg-base-200">
                    <app-barcode-scanner
                      #barcodeScanner
                      [compact]="true"
                      (barcodeScanned)="onBarcodeScanned($event)"
                      (scanningStateChange)="onScanningStateChange($event)"
                    />
                  </div>
                }
              </div>
            }
          </div>

          <!-- Photo Method -->
          <div class="space-y-2">
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
        </div>

        @if (!hasValidIdentification()) {
          <div class="bg-warning/10 p-2 rounded text-xs mt-2">
            Add a barcode or at least 5 label photos to continue. You can add more photos later in
            edit.
          </div>
        }
      </div>
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

  // Internal state
  readonly isScannerActive = signal(false);

  /**
   * Handle identification method change
   */
  onMethodChange(method: 'barcode' | 'label-photos'): void {
    // Stop scanner if switching away from barcode
    if (method !== 'barcode' && this.isScannerActive()) {
      this.stopScanner();
    }
    this.methodChange.emit(method);
  }

  /**
   * Handle barcode scanned
   */
  onBarcodeScanned(barcode: string): void {
    this.barcodeScanned.emit(barcode);
    // Scanner will stop itself, but ensure state is updated
    this.isScannerActive.set(false);
  }

  /**
   * Handle photos changed
   */
  onPhotosChanged(photos: File[]): void {
    this.photosChanged.emit(photos);
  }

  /**
   * Handle scanner state change
   */
  onScanningStateChange(isScanning: boolean): void {
    this.isScannerActive.set(isScanning);
  }

  /**
   * Start barcode scanner
   */
  async startBarcodeScanner(): Promise<void> {
    // Ensure barcode method is selected
    if (this.identificationMethod() !== 'barcode') {
      this.onMethodChange('barcode');
      // Wait for view to update
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // Set scanner active first so component renders
    this.isScannerActive.set(true);

    // Wait for component to be rendered in DOM
    await new Promise((resolve) => setTimeout(resolve, 50));

    const scanner = this.barcodeScanner();
    if (scanner) {
      await scanner.startScanning();
    } else {
      console.error('Barcode scanner component not found');
      this.isScannerActive.set(false);
    }
  }

  /**
   * Stop scanner
   */
  stopScanner(): void {
    const scanner = this.barcodeScanner();
    if (scanner) {
      scanner.stopScanning();
    }
    this.isScannerActive.set(false);
  }
}
