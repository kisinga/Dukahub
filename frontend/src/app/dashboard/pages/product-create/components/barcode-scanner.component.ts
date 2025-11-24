import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { BarcodeScannerService } from '../../../../core/services/barcode-scanner.service';
import { CameraService } from '../../../../core/services/camera.service';

/**
 * Barcode Scanner Component
 *
 * Displays camera feed and scans barcodes.
 * Self-contained component handling its own camera lifecycle.
 * Can be displayed in compact mode for inline use.
 */
@Component({
  selector: 'app-barcode-scanner',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (compact()) {
      <!-- Compact inline mode -->
      <div class="space-y-2">
        @if (isScanning()) {
          <div class="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video #cameraVideo autoplay playsinline class="w-full h-full object-cover"></video>
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="border-2 border-primary w-3/4 h-3/4 rounded-lg"></div>
            </div>
          </div>
          <button
            type="button"
            (click)="stopScanning()"
            class="btn btn-sm btn-error btn-block gap-2"
          >
            <span class="material-symbols-outlined text-base">stop</span>
            <span>Stop Scanner</span>
          </button>
        } @else {
          <div class="text-center text-xs opacity-60 py-2">Ready to scan barcode</div>
        }
        @if (lastScannedCode()) {
          <div role="alert" class="alert alert-success alert-sm py-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
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
            <span class="text-xs">Scanned: {{ lastScannedCode() }}</span>
          </div>
        }
      </div>
    } @else {
      <!-- Full card mode (default) -->
      <div class="card card-border bg-base-100">
        <div class="card-body">
          <h2 class="card-title">Scan Barcode</h2>
          <p class="text-sm text-base-content/70 mb-4">
            Scan product barcodes to automatically fill barcode field
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
              <span>Click "Scan with camera" to start scanning</span>
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
    }
  `,
})
export class BarcodeScannerComponent implements OnDestroy {
  private readonly cameraService = inject(CameraService);
  private readonly barcodeService = inject(BarcodeScannerService);

  // View reference
  readonly cameraVideo = viewChild<ElementRef<HTMLVideoElement>>('cameraVideo');

  // Inputs
  readonly compact = input<boolean>(false);

  // State
  readonly isScanning = signal(false);
  readonly lastScannedCode = signal<string | null>(null);

  // Outputs
  readonly barcodeScanned = output<string>();
  readonly scanningStateChange = output<boolean>();

  /**
   * Start barcode scanning
   * Called by parent component when user clicks "Scan with camera" button
   */
  async startScanning(): Promise<void> {
    // Wait for next tick to ensure video element is rendered
    await new Promise((resolve) => setTimeout(resolve, 0));

    const videoEl = this.cameraVideo()?.nativeElement;

    if (!videoEl) {
      console.error('Video element not found');
      return;
    }

    try {
      // Start camera
      const started = await this.cameraService.startCamera(videoEl);
      if (!started) {
        console.error('Failed to start camera:', this.cameraService.error());
        return;
      }

      this.isScanning.set(true);
      this.scanningStateChange.emit(true);

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
    this.scanningStateChange.emit(false);
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
