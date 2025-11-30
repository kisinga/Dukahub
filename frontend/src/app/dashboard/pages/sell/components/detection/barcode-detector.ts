import { BarcodeScannerService } from '../../../../../core/services/barcode-scanner.service';
import { ProductSearchService } from '../../../../../core/services/product/product-search.service';
import { ScannerBeepService } from '../../../../../core/services/scanner-beep.service';
import { Detector, DetectionResult } from './detection.types';

/**
 * Barcode detector implementing the Detector interface.
 * Uses BarcodeScannerService for single-frame barcode detection
 * and ProductSearchService for product lookup.
 */
export class BarcodeDetector implements Detector {
  readonly name = 'barcode';

  private ready = false;
  private processing = false;

  constructor(
    private readonly barcodeService: BarcodeScannerService,
    private readonly productSearchService: ProductSearchService,
    private readonly beepService: ScannerBeepService,
  ) {}

  async initialize(): Promise<boolean> {
    // Check if barcode detection is supported
    if (!this.barcodeService.isSupported()) {
      console.log('[BarcodeDetector] BarcodeDetector API not supported');
      this.ready = false;
      return false;
    }

    // Initialize the barcode detector
    const initialized = await this.barcodeService.initialize();
    this.ready = initialized;

    if (initialized) {
      console.log('[BarcodeDetector] Initialized successfully');
    } else {
      console.warn('[BarcodeDetector] Failed to initialize');
    }

    return initialized;
  }

  async processFrame(video: HTMLVideoElement): Promise<DetectionResult | null> {
    if (!this.ready || this.processing) {
      return null;
    }

    // Check if video is ready
    if (!video.videoWidth || video.paused || video.ended) {
      return null;
    }

    this.processing = true;

    try {
      // Use single-frame detection
      const barcodeResult = await this.barcodeService.detectOnce(video);

      if (!barcodeResult) {
        return null;
      }

      console.log('[BarcodeDetector] Barcode detected:', barcodeResult.rawValue);

      // Look up product by barcode
      const variant = await this.productSearchService.searchByBarcode(barcodeResult.rawValue);

      if (!variant) {
        console.warn(`[BarcodeDetector] Barcode "${barcodeResult.rawValue}" not found in system`);
        return null;
      }

      // Play beep on successful detection (fire and forget)
      this.beepService.playBeep().catch(() => {
        // Silently handle beep errors
      });

      // Build detection result
      const result: DetectionResult = {
        type: 'barcode',
        product: {
          id: variant.productId,
          name: variant.productName,
          variants: [variant],
          featuredAsset: variant.featuredAsset,
        },
        rawValue: barcodeResult.rawValue,
        confidence: 1.0, // Barcode detection is binary - found or not
      };

      console.log('[BarcodeDetector] Product found:', result.product.name);
      return result;
    } catch (error) {
      console.error('[BarcodeDetector] Error processing frame:', error);
      return null;
    } finally {
      this.processing = false;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  isProcessing(): boolean {
    return this.processing;
  }

  cleanup(): void {
    this.ready = false;
    this.processing = false;
    // Note: We don't call barcodeService.stopScanning() here because
    // we're using detectOnce() which doesn't start continuous scanning
    console.log('[BarcodeDetector] Cleaned up');
  }
}

