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
 * Tabbed interface for barcode vs photo identification.
 * Clean either/or choice with distinct content areas.
 */
@Component({
  selector: 'app-identification-selector',
  imports: [CommonModule, ReactiveFormsModule, PhotoManagerComponent, BarcodeScannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card bg-base-100 border border-base-300">
      <!-- Tabs using daisyUI -->
      <div role="tablist" class="tabs tabs-boxed bg-base-200 rounded-t-lg rounded-b-none">
        <button
          type="button"
          role="tab"
          class="tab tab-lg flex-1 gap-2"
          [class.tab-active]="identificationMethod() === 'barcode'"
          (click)="onMethodChange('barcode')"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 5h2v14H3zM7 5h1v14H7zM11 5h2v14h-2zM15 5h1v14h-1zM19 5h2v14h-2z"/>
          </svg>
          <span>Barcode</span>
          @if (barcodeControl().value) {
            <span class="badge badge-sm badge-success">✓</span>
          }
        </button>
        <button
          type="button"
          role="tab"
          class="tab tab-lg flex-1 gap-2"
          [class.tab-active]="identificationMethod() === 'label-photos'"
          (click)="onMethodChange('label-photos')"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
          </svg>
          <span>Photos</span>
          @if (photoCount() >= 5) {
            <span class="badge badge-sm badge-success">✓</span>
          } @else if (photoCount() > 0) {
            <span class="badge badge-sm badge-primary">{{ photoCount() }}</span>
          }
        </button>
      </div>

      <!-- Tab content -->
      <div class="card-body p-4 min-h-[120px]">
        @if (identificationMethod() === 'barcode') {
          <div class="space-y-3">
            @if (isScannerActive()) {
              <app-barcode-scanner
                #barcodeScanner
                [compact]="true"
                (barcodeScanned)="onBarcodeScanned($event)"
                (scanningStateChange)="onScanningStateChange($event)"
              />
            } @else {
              <!-- Input + scan button using join -->
              <div class="join w-full">
                <input
                  type="text"
                  [formControl]="barcodeControl()"
                  placeholder="Enter or scan barcode"
                  class="input input-bordered join-item flex-1"
                />
                <button
                  type="button"
                  class="btn btn-square btn-outline join-item"
                  (click)="startBarcodeScanner()"
                  title="Scan with camera"
                >
                  <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </button>
              </div>
              @if (barcodeControl().value) {
                <div class="alert alert-success py-2">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10-3-3"/>
                  </svg>
                  <span class="text-sm">Barcode ready</span>
                </div>
              } @else {
                <p class="text-xs text-center opacity-60">Scan product barcode or type it manually</p>
              }
            }
          </div>
        }

        @if (identificationMethod() === 'label-photos') {
          <div class="space-y-3">
            <app-photo-manager
              #photoManager
              (photosChanged)="onPhotosChanged($event)"
            />
            @if (photoCount() >= 5) {
              <div class="alert alert-success py-2">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10-3-3"/>
                </svg>
                <span class="text-sm">{{ photoCount() }} photos ready</span>
              </div>
            } @else {
              <p class="text-xs text-center opacity-60">Take {{ 5 - photoCount() }} more photo{{ 5 - photoCount() > 1 ? 's' : '' }} of the product label</p>
            }
          </div>
        }

        @if (!identificationMethod()) {
          <div class="flex items-center justify-center h-24">
            <p class="text-sm opacity-40">Choose how to identify this product</p>
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
