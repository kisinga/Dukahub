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
import { ScannerBeepService } from '../../../../core/services/scanner-beep.service';
import { TracingService } from '../../../../core/services/tracing.service';

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
        @if (error()) {
          <div role="alert" class="alert alert-error alert-sm py-1">
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
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span class="text-xs">{{ error() }}</span>
          </div>
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

          <!-- Error message -->
          @if (error()) {
            <div role="alert" class="alert alert-error">
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
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 class="font-bold">Barcode scanning not available</h3>
                <div class="text-xs">{{ error() }}</div>
              </div>
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
  private readonly scannerBeepService = inject(ScannerBeepService);
  private readonly tracingService = inject(TracingService, { optional: true });

  // View reference
  readonly cameraVideo = viewChild<ElementRef<HTMLVideoElement>>('cameraVideo');

  // Inputs
  readonly compact = input<boolean>(false);

  // State
  readonly isScanning = signal(false);
  readonly lastScannedCode = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  // Cleanup function from camera service
  private cameraCleanup: (() => void) | null = null;
  private scannerSpan: any = null; // Span for scanner session

  // Outputs
  readonly barcodeScanned = output<string>();
  readonly scanningStateChange = output<boolean>();
  readonly errorOccurred = output<string>();

  /**
   * Start barcode scanning
   * Called by parent component when user clicks "Scan with camera" button
   */
  async startScanning(): Promise<void> {
    // Start telemetry span for scanner session
    const span = this.tracingService?.startSpan('barcode.scanner.start', {
      'barcode.scanner.mode': this.compact() ? 'compact' : 'full',
    });
    this.scannerSpan = span || null;

    // Clear any previous errors
    this.error.set(null);

    // Check if barcode scanning is supported BEFORE starting camera
    // This prevents wasting resources and shows error immediately
    if (!this.barcodeService.isSupported()) {
      // Provide more helpful error message with diagnostics
      const diagnostics = this.barcodeService.getDiagnostics();
      const userAgent = navigator.userAgent;
      const isChrome = /Chrome/.test(userAgent) && !/Edge|Edg/.test(userAgent);
      const isEdge = /Edge|Edg/.test(userAgent);
      const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
      const isSecureContext = window.isSecureContext;

      let errorMsg = 'BarcodeDetector API is not available. ';

      if (!isSecureContext) {
        errorMsg += 'This feature requires HTTPS or localhost. ';
      } else if (isChrome || isEdge || isSafari) {
        errorMsg +=
          'Your browser may not support this feature yet. Please ensure you are using Chrome 88+, Edge 88+, or Safari 16.4+. ';
      } else {
        errorMsg += 'Please use a supported browser (Chrome 88+, Edge 88+, or Safari 16.4+). ';
      }

      errorMsg += 'You can still enter the barcode manually.';

      this.error.set(errorMsg);
      this.errorOccurred.emit(errorMsg);
      console.warn('Barcode scanner not supported', diagnostics);

      // Log to telemetry
      if (this.scannerSpan) {
        this.tracingService?.setAttributes(this.scannerSpan, {
          'barcode.scanner.result': 'not_supported',
          'barcode.scanner.error': 'barcode_detector_not_available',
          'barcode.scanner.secure_context': diagnostics.isSecureContext.toString(),
          'barcode.scanner.has_detector': diagnostics.hasBarcodeDetector.toString(),
          'barcode.scanner.browser': isChrome
            ? 'chrome'
            : isEdge
              ? 'edge'
              : isSafari
                ? 'safari'
                : 'other',
        });
        this.tracingService?.endSpan(this.scannerSpan, false);
      }
      this.scannerSpan = null;
      return;
    }

    // CRITICAL: Set isScanning FIRST so video element renders in DOM
    this.isScanning.set(true);
    this.scanningStateChange.emit(true);

    // Wait for Angular's change detection to render the video element
    const videoEl = await this.waitForVideoElement();

    if (!videoEl) {
      // Cleanup and error handling
      const errorMsg = 'Video element not found. Please try again.';
      this.error.set(errorMsg);
      this.errorOccurred.emit(errorMsg);
      this.isScanning.set(false);
      this.scanningStateChange.emit(false);
      console.error(errorMsg);

      // Log to telemetry
      if (this.scannerSpan) {
        this.tracingService?.setAttributes(this.scannerSpan, {
          'barcode.scanner.result': 'error',
          'barcode.scanner.error': 'video_element_not_found',
        });
        this.tracingService?.endSpan(this.scannerSpan, false);
      }
      this.scannerSpan = null;
      return;
    }

    try {
      // Start camera with mobile optimization
      this.cameraCleanup = await this.cameraService.startCamera(videoEl, {
        facingMode: 'environment',
        optimizeForMobile: true,
      });

      if (this.scannerSpan) {
        this.tracingService?.addEvent(this.scannerSpan, 'barcode.scanner.camera_started', {
          'barcode.scanner.video_width': videoEl.videoWidth || 0,
          'barcode.scanner.video_height': videoEl.videoHeight || 0,
        });
      }

      // Initialize barcode scanner
      const initialized = await this.barcodeService.initialize();
      if (!initialized) {
        const errorMsg =
          'Failed to initialize barcode scanner. Please try again or enter the barcode manually.';
        this.error.set(errorMsg);
        this.errorOccurred.emit(errorMsg);
        if (this.scannerSpan) {
          this.tracingService?.setAttributes(this.scannerSpan, {
            'barcode.scanner.result': 'error',
            'barcode.scanner.error': 'initialization_failed',
          });
          this.tracingService?.endSpan(this.scannerSpan, false);
        }
        this.scannerSpan = null;
        this.stopScanning();
        console.error(errorMsg);
        return;
      }

      // Start barcode scanning with timeout and visibility handling
      this.barcodeService.startScanning(
        videoEl,
        (result) => {
          // Barcode detected
          this.lastScannedCode.set(result.rawValue);

          // Play beep sound on successful detection (fire and forget)
          this.scannerBeepService.playBeep().catch(() => {
            // Silently handle beep errors - don't interrupt detection flow
          });

          this.barcodeScanned.emit(result.rawValue);
          if (this.scannerSpan) {
            this.tracingService?.setAttributes(this.scannerSpan, {
              'barcode.scanner.result': 'success',
              'barcode.scanner.barcode_format': result.format,
              'barcode.scanner.barcode_length': result.rawValue.length,
            });
            this.tracingService?.endSpan(this.scannerSpan, true);
          }
          this.scannerSpan = null;
          this.stopScanning();
        },
        { timeoutMs: 30000, pauseOnHidden: true },
      );
    } catch (error: any) {
      const errorMsg = error?.message || 'Failed to start barcode scanner. Please try again.';
      this.error.set(errorMsg);
      this.errorOccurred.emit(errorMsg);
      console.error('Failed to start barcode scanner:', error);
      if (this.scannerSpan) {
        this.tracingService?.setAttributes(this.scannerSpan, {
          'barcode.scanner.result': 'error',
          'barcode.scanner.error': error?.name || 'unknown_error',
          'barcode.scanner.error_message': errorMsg,
        });
        this.tracingService?.endSpan(this.scannerSpan, false, error);
      }
      this.scannerSpan = null;
      this.stopScanning();
    }
  }

  /**
   * Stop barcode scanning and release camera
   */
  stopScanning(): void {
    this.barcodeService.stopScanning();

    // Use cleanup function if available, otherwise fallback to manual stop
    if (this.cameraCleanup) {
      this.cameraCleanup();
      this.cameraCleanup = null;
    } else {
      const videoEl = this.cameraVideo()?.nativeElement;
      if (videoEl) {
        this.cameraService.stopCamera(videoEl);
      }
    }

    // End scanner span if still active (user cancelled)
    const span = this.scannerSpan;
    if (span) {
      this.tracingService?.setAttributes(span, {
        'barcode.scanner.result': 'cancelled',
      });
      this.tracingService?.endSpan(span, true);
      this.scannerSpan = null;
    }

    this.isScanning.set(false);
    this.scanningStateChange.emit(false);
    // Don't clear error on stop - let user see what went wrong
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

  /**
   * Clear error message
   */
  clearError(): void {
    this.error.set(null);
  }

  /**
   * Wait for video element to be available in the DOM
   * Uses double-RAF pattern to wait for Angular change detection + DOM paint
   */
  private async waitForVideoElement(): Promise<HTMLVideoElement | null> {
    // Wait for Angular change detection + DOM paint (double RAF ensures paint complete)
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    // Poll for element with timeout
    const maxRetries = 10;
    const retryDelay = 50; // 50ms between retries
    let retries = 0;

    return new Promise<HTMLVideoElement | null>((resolve) => {
      const checkForElement = () => {
        const videoEl = this.cameraVideo()?.nativeElement;
        if (videoEl) {
          resolve(videoEl);
          return;
        }

        retries++;
        if (retries >= maxRetries) {
          // Timeout after max retries
          console.warn(
            `Video element not found after ${maxRetries} retries (${maxRetries * retryDelay}ms)`,
          );
          resolve(null);
          return;
        }

        // Retry after a short delay
        setTimeout(checkForElement, retryDelay);
      };

      // Start checking immediately after RAF
      checkForElement();
    });
  }
}
