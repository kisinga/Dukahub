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
import {
  BarcodeResult,
  BarcodeScannerService,
} from '../../../../core/services/barcode-scanner.service';
import { CameraService } from '../../../../core/services/camera.service';
import type { MlModelService, ModelPrediction } from '../../../../core/services/ml-model.service';
import { loadMlModelService } from '../../../../core/services/ml-model.loader';
import { ProductSearchResult, ProductSearchService } from '../../../../core/services/product/product-search.service';

type ScannerStatus =
  | 'idle'
  | 'initializing'
  | 'loading_model'
  | 'ready'
  | 'scanning'
  | 'detecting'
  | 'error';

/**
 * Product scanner component with ML and barcode detection
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
          </div>
          <button class="btn btn-sm btn-error" (click)="stopScanner()">Stop</button>
        </div>

        <!-- Camera View -->
        <div class="relative bg-black rounded-lg overflow-hidden" style="aspect-ratio: 4/3">
          <video #cameraView class="w-full h-full object-cover" autoplay playsinline muted></video>

          <!-- Scan Frame -->
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="scan-frame"></div>
          </div>
        </div>

        <!-- Status Footer -->
        <div class="text-center text-xs opacity-60 mt-2">
          Point camera at product or barcode
        </div>
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
      0%, 100% {
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
  readonly detectionIntervalMs = input<number>(1200);
  readonly enableMLDetection = input<boolean>(true);
  readonly enableBarcodeScanning = input<boolean>(true);
  readonly autoStartOnMobile = input<boolean>(true);

  // Outputs
  readonly productDetected = output<ProductSearchResult>();
  readonly scannerReady = output<void>();
  readonly scannerError = output<string>();
  readonly scanningStateChange = output<boolean>(); // Emit when scanning starts/stops

  // Services
  private readonly injector = inject(Injector);
  private readonly mlModelServiceSignal = signal<MlModelService | null>(null);
  private readonly cameraService = inject(CameraService);
  private readonly barcodeService = inject(BarcodeScannerService);
  private readonly productSearchService = inject(ProductSearchService);

  // View references
  readonly videoElement = viewChild<ElementRef<HTMLVideoElement>>('cameraView');

  // State
  readonly scannerStatus = signal<ScannerStatus>('idle');
  readonly isScanning = signal<boolean>(false);
  readonly mlModelError = computed(() => this.mlModelServiceSignal()?.error() ?? null);

  // Detection loop
  private detectionInterval: any = null;

  readonly canStart = computed(() => {
    const status = this.scannerStatus();
    return status === 'idle' || status === 'ready' || status === 'error';
  });

  ngOnInit(): void {
    this.initializeScanner();
  }

  ngOnDestroy(): void {
    this.stopScanner();
    this.mlModelServiceSignal()?.unloadModel();
  }

  private async initializeScanner(): Promise<void> {
    this.scannerStatus.set('initializing');

    try {
      const cameraAvailable = await this.cameraService.isCameraAvailable();
      if (!cameraAvailable) {
        const error = 'No camera found on this device';
        this.scannerStatus.set('error');
        this.scannerError.emit(error);
        return;
      }

      if (this.enableBarcodeScanning() && this.barcodeService.isSupported()) {
        await this.barcodeService.initialize();
      }

      if (this.enableMLDetection()) {
        this.scannerStatus.set('loading_model');
        const mlModelService = await this.ensureMlModelService();
        const modelLoaded = await mlModelService.loadModel(this.channelId());

        if (!modelLoaded) {
          const error = mlModelService.error();
          console.warn('ML model not available:', error?.message);
        }
      }

      this.scannerStatus.set('ready');
      this.scannerReady.emit();

      // Auto-start on mobile - but don't propagate errors
      if (this.autoStartOnMobile() && this.isMobileDevice()) {
        setTimeout(() => {
          this.startScanner().catch((err) => {
            console.warn('Auto-start failed (non-fatal):', err);
            // Reset to ready state so user can manually retry
            this.scannerStatus.set('ready');
          });
        }, 500);
      }
    } catch (error: any) {
      console.error('Scanner initialization failed:', error);
      this.scannerStatus.set('error');
      this.scannerError.emit(error.message);
    }
  }

  async startScanner(): Promise<void> {
    if (!this.canStart()) {
      console.warn('Cannot start scanner in current state:', this.scannerStatus());
      return;
    }

    // If recovering from error, clear it first
    if (this.scannerStatus() === 'error') {
      this.scannerStatus.set('initializing');
    }

    // CRITICAL: Set isScanning FIRST so video element renders in DOM
    this.isScanning.set(true);
    this.scanningStateChange.emit(true);

    // Wait for next tick to ensure video element is rendered
    await new Promise(resolve => setTimeout(resolve, 0));

    const videoEl = this.videoElement()?.nativeElement;
    if (!videoEl) {
      const error = 'Camera view not ready. Please try again.';
      this.scannerStatus.set('error');
      this.scannerError.emit(error);
      this.isScanning.set(false);
      this.scanningStateChange.emit(false);
      throw new Error(error);
    }

    try {
      const started = await this.cameraService.startCamera(videoEl);
      if (!started) {
        const error = this.cameraService.error() || 'Failed to access camera';
        this.scannerStatus.set('error');
        this.scannerError.emit(error);
        this.isScanning.set(false);
        this.scanningStateChange.emit(false);
        throw new Error(error);
      }

      this.scannerStatus.set('scanning');
      this.startDetectionLoops(videoEl);
    } catch (error: any) {
      console.error('Failed to start scanner:', error);
      this.scannerStatus.set('error');
      this.scannerError.emit(error.message);
      this.isScanning.set(false);
      this.scanningStateChange.emit(false);
      throw error; // Propagate for promise chain
    }
  }

  stopScanner(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    this.barcodeService.stopScanning();

    const videoEl = this.videoElement()?.nativeElement;
    if (videoEl) {
      this.cameraService.stopCamera(videoEl);
    }

    this.isScanning.set(false);
    this.scannerStatus.set('ready');
    this.scanningStateChange.emit(false);
  }

  toggleScanner(): void {
    if (this.isScanning()) {
      this.stopScanner();
    } else {
      this.startScanner();
    }
  }

  private startDetectionLoops(videoElement: HTMLVideoElement): void {
    if (this.enableBarcodeScanning() && this.barcodeService.isSupported()) {
      this.barcodeService.startScanning(
        videoElement,
        (result) => this.handleBarcodeDetection(result),
        500
      );
    }

    if (this.enableMLDetection() && this.isMlModelInitialized()) {
      this.detectionInterval = setInterval(() => {
        this.runMLDetection(videoElement);
      }, this.detectionIntervalMs());
    }
  }

  private async runMLDetection(videoElement: HTMLVideoElement): Promise<void> {
    if (
      !this.isScanning() ||
      !videoElement.videoWidth ||
      videoElement.paused ||
      videoElement.ended
    ) {
      return;
    }

    try {
      const mlModelService = await this.ensureMlModelService();
      const predictions = await mlModelService.predict(videoElement, 3);
      const bestPrediction = predictions[0];

      if (bestPrediction && bestPrediction.probability >= this.confidenceThreshold()) {
        console.log('ML Detection:', bestPrediction);
        this.scannerStatus.set('detecting');
        await this.handleMLDetection(bestPrediction);
      }
    } catch (error) {
      console.error('ML detection error:', error);
    }
  }

  private async handleMLDetection(prediction: ModelPrediction): Promise<void> {
    const mlModelService = await this.ensureMlModelService();
    const productId = mlModelService.getProductIdFromLabel(prediction.className);

    try {
      // const product = await this.productSearchService.getProductById(productId);
      // HARDCODED PRODUCT ID FOR TESTING
      const product = await this.productSearchService.getProductById("3");

      if (product) {
        this.stopScanner();
        this.productDetected.emit(product);
      } else {
        // Product not in database - log and continue scanning
        console.warn(`⚠️ ML detected "${prediction.className}" but product not found in system`);
        // Don't stop scanner, just continue looking
      }
    } catch (error) {
      console.error('Product lookup failed:', error);
      // Don't stop scanner on lookup errors
    }
  }

  private async handleBarcodeDetection(result: BarcodeResult): Promise<void> {
    console.log('Barcode detected:', result);

    try {
      const variant = await this.productSearchService.searchByBarcode(result.rawValue);

      if (variant) {
        this.stopScanner();
        const product: ProductSearchResult = {
          id: variant.productId,
          name: variant.productName,
          variants: [variant],
          featuredAsset: variant.featuredAsset,
        };
        this.productDetected.emit(product);
      } else {
        // Barcode not in database - log and continue scanning
        console.warn(`⚠️ Barcode "${result.rawValue}" not found in system`);
        // Don't stop scanner, just continue looking
      }
    } catch (error) {
      console.error('Barcode lookup failed:', error);
      // Don't stop scanner on lookup errors
    }
  }

  private isMobileDevice(): boolean {
    return navigator.maxTouchPoints > 0 && window.innerWidth < 768;
  }

  private isMlModelInitialized(): boolean {
    const service = this.mlModelServiceSignal();
    return service ? service.isInitialized() : false;
  }

  private async ensureMlModelService(): Promise<MlModelService> {
    const existing = this.mlModelServiceSignal();
    if (existing) {
      return existing;
    }

    const service = await loadMlModelService(this.injector);
    this.mlModelServiceSignal.set(service);
    return service;
  }
}

