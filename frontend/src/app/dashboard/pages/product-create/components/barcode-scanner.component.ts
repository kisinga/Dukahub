import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { BarcodeScannerService } from '../../../../core/services/barcode-scanner.service';
import { CameraService } from '../../../../core/services/camera.service';

/**
 * Barcode Scanner Component
 *
 * Displays camera feed and scans barcodes for SKU generation.
 * Self-contained component handling its own camera lifecycle.
 */
@Component({
  selector: 'app-barcode-scanner',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card card-border bg-base-100">
      <div class="card-body">
        <h2 class="card-title">Scan Barcode for SKU</h2>
        <p class="text-sm text-base-content/70 mb-4">
          Scan product barcodes to automatically fill SKU fields
        </p>

        @if (!isScanning()) {
          <!-- Instructions when not scanning -->
          <div role="alert" class="alert alert-info mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Click "Scan Barcode" button next to any SKU field below</span>
          </div>
        } @else {
          <!-- Camera view when scanning -->
          <div class="mb-4">
            <div class="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video #cameraVideo autoplay playsinline class="w-full h-full object-cover"></video>
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div class="border-2 border-primary w-3/4 h-3/4 rounded-lg"></div>
              </div>
            </div>
            <button type="button" (click)="stopScanning()" class="btn btn-error btn-block mt-2">
              Stop Scanner
            </button>
          </div>
        }

        <!-- Success message after scan -->
        @if (lastScannedCode()) {
          <div role="alert" class="alert alert-success">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Barcode scanned: {{ lastScannedCode() }}</span>
          </div>
        }
      </div>
    </div>
  `,
})
export class BarcodeScannerComponent implements OnDestroy {
  private readonly cameraService = inject(CameraService);
  private readonly barcodeService = inject(BarcodeScannerService);

  // View reference
  readonly cameraVideo = viewChild<ElementRef<HTMLVideoElement>>('cameraVideo');

  // State
  readonly isScanning = signal(false);
  readonly lastScannedCode = signal<string | null>(null);

  // Output
  readonly barcodeScanned = output<string>();

  /**
   * Start barcode scanning
   * Called by parent component when user clicks "Scan Barcode" button
   */
  async startScanning(): Promise<void> {
    const videoEl = this.cameraVideo()?.nativeElement;

    if (!videoEl) {
      console.error('Video element not found');
      return;
    }

    try {
      // Start camera
      const started = await this.cameraService.startCamera(videoEl);
      if (!started) {
        console.error('Failed to start camera');
        return;
      }

      this.isScanning.set(true);

      // Start barcode scanning
      if (this.barcodeService.isSupported()) {
        await this.barcodeService.initialize();
        this.barcodeService.startScanning(
          videoEl,
          (result) => {
            // Barcode detected
            this.lastScannedCode.set(result.rawValue);
            this.barcodeScanned.emit(result.rawValue);
            this.stopScanning();
          },
          500,
        );
      } else {
        console.warn('Barcode scanner not supported');
        this.stopScanning();
      }
    } catch (error) {
      console.error('Failed to start barcode scanner:', error);
      this.stopScanning();
    }
  }

  /**
   * Stop barcode scanning and release camera
   */
  stopScanning(): void {
    this.barcodeService.stopScanning();

    const videoEl = this.cameraVideo()?.nativeElement;
    if (videoEl) {
      this.cameraService.stopCamera(videoEl);
    }

    this.isScanning.set(false);
  }

  /**
   * Cleanup when component is destroyed
   */
  ngOnDestroy(): void {
    this.stopScanning();
  }

  /**
   * Clear last scanned code (for reset)
   */
  clearLastScan(): void {
    this.lastScannedCode.set(null);
  }
}
