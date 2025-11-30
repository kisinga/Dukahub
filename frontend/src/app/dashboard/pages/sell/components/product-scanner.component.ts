import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { BarcodeScannerService } from '../../../../core/services/barcode-scanner.service';
import { CameraService } from '../../../../core/services/camera.service';
import { ProductSearchResult } from '../../../../core/services/product/product-search.service';
import { ProductSearchService } from '../../../../core/services/product/product-search.service';
import { ScannerBeepService } from '../../../../core/services/scanner-beep.service';
import { BarcodeDetector } from './detection/barcode-detector';
import { DetectionCoordinator } from './detection/detection-coordinator';
import { DetectionResult } from './detection/detection.types';
import { MLDetector } from './detection/ml-detector';

type ScannerStatus = 'idle' | 'initializing' | 'ready' | 'scanning' | 'error';

/**
 * Product scanner component with dual detection (barcode + ML)
 *
 * Uses a modular architecture with:
 * - DetectionCoordinator: manages frame distribution between detectors
 * - BarcodeDetector: barcode scanning via BarcodeDetector API
 * - MLDetector: ML-based product recognition via TensorFlow.js
 *
 * Frame distribution is alternating (50/50) between barcode and ML detection.
 */
@Component({
  selector: 'app-product-scanner',
  imports: [CommonModule],
  template: `
    @if (isScanning()) {
      <div class="card bg-base-100 shadow-xl border-2 border-primary animate-in">
        <div class="card-body p-3">
          <!-- Scanner Header -->
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              <span class="font-semibold text-sm">Scanning...</span>
              @if (activeDetectors().length > 0) {
                <span class="text-xs opacity-60">({{ activeDetectors().join(', ') }})</span>
              }
            </div>
            <button class="btn btn-sm btn-error" (click)="stopScanner()">Stop</button>
          </div>

          <!-- Camera View -->
          <div class="relative bg-black rounded-lg overflow-hidden" style="aspect-ratio: 4/3">
            <video
              #cameraView
              class="w-full h-full object-cover"
              autoplay
              playsinline
              muted
            ></video>

            <!-- Scan Frame -->
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="scan-frame"></div>
            </div>
          </div>

          <!-- Status Footer -->
          <div class="text-center text-xs opacity-60 mt-2">Point camera at product or barcode</div>
        </div>
      </div>
    }
  `,
  styles: `
    .scan-frame {
      width: 80%;
      height: 60%;
      max-width: 300px;
      max-height: 300px;
      border: 3px solid oklch(var(--p));
      border-radius: 1rem;
      box-shadow: 0 0 0 9999px rgb(0 0 0 / 0.5);
      animation: scan-pulse 2s ease-in-out infinite;
    }

    @keyframes scan-pulse {
      0%,
      100% {
        opacity: 1;
        border-color: oklch(var(--p));
      }
      50% {
        opacity: 0.7;
        border-color: oklch(var(--s));
      }
    }

    .animate-in {
      animation: slideIn 0.3s ease-in-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductScannerComponent implements OnInit, OnDestroy {
  // Inputs
  readonly channelId = input.required<string>();
  readonly confidenceThreshold = input<number>(0.9);
  readonly enableMLDetection = input<boolean>(true);
  readonly enableBarcodeScanning = input<boolean>(true);
  readonly autoStartOnMobile = input<boolean>(true);
  readonly detectionTimeoutMs = input<number>(30000);

  // Outputs
  readonly productDetected = output<ProductSearchResult>();
  readonly scannerReady = output<void>();
  readonly scannerError = output<string>();
  readonly scanningStateChange = output<boolean>();

  // Services
  private readonly injector = inject(Injector);
  private readonly cameraService = inject(CameraService);
  private readonly barcodeService = inject(BarcodeScannerService);
  private readonly productSearchService = inject(ProductSearchService);
  private readonly beepService = inject(ScannerBeepService);

  // View references
  readonly videoElement = viewChild<ElementRef<HTMLVideoElement>>('cameraView');

  // State
  readonly scannerStatus = signal<ScannerStatus>('idle');
  readonly isScanning = signal<boolean>(false);
  readonly activeDetectors = signal<string[]>([]);

  // Detection coordinator
  private coordinator: DetectionCoordinator | null = null;
  private cameraCleanup: (() => void) | null = null;

  readonly canStart = computed(() => {
    const status = this.scannerStatus();
    return status === 'idle' || status === 'ready' || status === 'error';
  });

  ngOnInit(): void {
    this.initializeScanner();
  }

  ngOnDestroy(): void {
    this.stopScanner();
    this.coordinator?.cleanup();
    this.coordinator = null;
  }

  /**
   * Initialize scanner - check camera, create coordinator and detectors
   */
  private async initializeScanner(): Promise<void> {
    this.scannerStatus.set('initializing');

    try {
      // Check camera availability
      const cameraAvailable = await this.cameraService.isCameraAvailable();
      if (!cameraAvailable) {
        const error = 'No camera found on this device';
        this.scannerStatus.set('error');
        this.scannerError.emit(error);
        return;
      }

      // Create coordinator
      this.coordinator = new DetectionCoordinator({
        timeoutMs: this.detectionTimeoutMs(),
        pauseOnHidden: true,
        minFrameIntervalMs: 100,
      });

      // Register barcode detector
      if (this.enableBarcodeScanning()) {
        const barcodeDetector = new BarcodeDetector(
          this.barcodeService,
          this.productSearchService,
          this.beepService,
        );
        this.coordinator.registerDetector(barcodeDetector);
      }

      // Register ML detector
      if (this.enableMLDetection()) {
        const mlDetector = new MLDetector(
          this.injector,
          this.productSearchService,
          this.beepService,
          this.channelId(),
          this.confidenceThreshold(),
        );
        this.coordinator.registerDetector(mlDetector);
      }

      // Initialize all detectors
      const anyReady = await this.coordinator.initializeDetectors();

      if (!anyReady) {
        console.warn('[ProductScanner] No detectors initialized successfully');
        // Continue anyway - camera will still work, just no detection
      }

      this.activeDetectors.set(this.coordinator.getReadyDetectors());
      this.scannerStatus.set('ready');
      this.scannerReady.emit();

      // Auto-start on mobile
      if (this.autoStartOnMobile() && this.isMobileDevice()) {
        setTimeout(() => {
          this.startScanner().catch((err) => {
            console.warn('[ProductScanner] Auto-start failed (non-fatal):', err);
            this.scannerStatus.set('ready');
          });
        }, 500);
      }
    } catch (error: any) {
      console.error('[ProductScanner] Initialization failed:', error);
      this.scannerStatus.set('error');
      this.scannerError.emit(error.message);
    }
  }

  /**
   * Start the scanner - show camera and begin detection
   */
  async startScanner(): Promise<void> {
    if (!this.canStart()) {
      console.warn('[ProductScanner] Cannot start in current state:', this.scannerStatus());
      return;
    }

    // If recovering from error, reset state
    if (this.scannerStatus() === 'error') {
      this.scannerStatus.set('initializing');
    }

    // CRITICAL: Set isScanning FIRST so video element renders in DOM
    this.isScanning.set(true);
    this.scanningStateChange.emit(true);

    // Wait for video element with robust polling
    const videoEl = await this.waitForVideoElement();

    if (!videoEl) {
      const error = 'Camera view not ready. Please try again.';
      this.scannerStatus.set('error');
      this.scannerError.emit(error);
      this.isScanning.set(false);
      this.scanningStateChange.emit(false);
      throw new Error(error);
    }

    try {
      // Start camera
      this.cameraCleanup = await this.cameraService.startCamera(videoEl, {
        facingMode: 'environment',
        optimizeForMobile: true,
      });

      this.scannerStatus.set('scanning');

      // Start detection coordinator
      if (this.coordinator) {
        this.coordinator.start(videoEl, (result: DetectionResult) => {
          this.handleDetection(result);
        });
        this.activeDetectors.set(this.coordinator.getReadyDetectors());
      }
    } catch (error: any) {
      console.error('[ProductScanner] Failed to start:', error);
      this.scannerStatus.set('error');
      this.scannerError.emit(error.message);
      this.isScanning.set(false);
      this.scanningStateChange.emit(false);
      throw error;
    }
  }

  /**
   * Stop the scanner
   */
  stopScanner(): void {
    // Stop coordinator
    this.coordinator?.stop();

    // Stop camera
    if (this.cameraCleanup) {
      this.cameraCleanup();
      this.cameraCleanup = null;
    } else {
      const videoEl = this.videoElement()?.nativeElement;
      if (videoEl) {
        this.cameraService.stopCamera(videoEl);
      }
    }

    this.isScanning.set(false);
    this.scannerStatus.set('ready');
    this.scanningStateChange.emit(false);
  }

  /**
   * Toggle scanner on/off
   */
  toggleScanner(): void {
    if (this.isScanning()) {
      this.stopScanner();
    } else {
      this.startScanner();
    }
  }

  /**
   * Handle detection result from coordinator
   */
  private handleDetection(result: DetectionResult): void {
    console.log(`[ProductScanner] Detection from ${result.type}:`, result.product.name);

    // Stop scanner
    this.stopScanner();

    // Emit product to parent
    this.productDetected.emit(result.product);
  }

  /**
   * Wait for video element to be available in the DOM
   * Uses double-RAF pattern + polling for reliability
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
        const videoEl = this.videoElement()?.nativeElement;
        if (videoEl) {
          resolve(videoEl);
          return;
        }

        retries++;
        if (retries >= maxRetries) {
          console.warn(
            `[ProductScanner] Video element not found after ${maxRetries} retries (${maxRetries * retryDelay}ms)`,
          );
          resolve(null);
          return;
        }

        setTimeout(checkForElement, retryDelay);
      };

      checkForElement();
    });
  }

  /**
   * Check if running on mobile device
   */
  private isMobileDevice(): boolean {
    return navigator.maxTouchPoints > 0 && window.innerWidth < 768;
  }
}
