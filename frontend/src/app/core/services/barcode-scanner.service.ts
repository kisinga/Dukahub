import { Injectable, signal } from '@angular/core';

/**
 * Barcode detection result
 */
export interface BarcodeResult {
    rawValue: string;
    format: string;
    boundingBox?: DOMRectReadOnly;
}

/**
 * Service for barcode scanning using BarcodeDetector API
 * Falls back to manual search if API is not available
 */
@Injectable({
    providedIn: 'root',
})
export class BarcodeScannerService {
    private detector: any = null; // BarcodeDetector type not in TypeScript by default
    private readonly isSupportedSignal = signal<boolean>(false);
    private readonly isScanningSignal = signal<boolean>(false);
    private scanInterval: any = null;

    readonly isSupported = this.isSupportedSignal.asReadonly();
    readonly isScanning = this.isScanningSignal.asReadonly();

    constructor() {
        this.checkSupport();
    }

    /**
     * Check if BarcodeDetector API is supported
     */
    private async checkSupport(): Promise<void> {
        // @ts-ignore - BarcodeDetector not in TypeScript lib
        if ('BarcodeDetector' in window) {
            try {
                // @ts-ignore
                const supportedFormats = await window.BarcodeDetector.getSupportedFormats();
                console.log('BarcodeDetector supported formats:', supportedFormats);
                this.isSupportedSignal.set(true);
            } catch (error) {
                console.warn('BarcodeDetector API check failed:', error);
                this.isSupportedSignal.set(false);
            }
        } else {
            console.log('BarcodeDetector API not available in this browser');
            this.isSupportedSignal.set(false);
        }
    }

    /**
     * Initialize barcode detector
     */
    async initialize(): Promise<boolean> {
        if (!this.isSupportedSignal()) {
            console.log('BarcodeDetector not supported, skipping initialization');
            return false;
        }

        try {
            // @ts-ignore
            this.detector = new window.BarcodeDetector({
                formats: [
                    'ean_13',
                    'ean_8',
                    'upc_a',
                    'upc_e',
                    'code_128',
                    'code_39',
                    'code_93',
                    'qr_code',
                    'data_matrix',
                ],
            });
            console.log('BarcodeDetector initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize BarcodeDetector:', error);
            return false;
        }
    }

    /**
     * Start continuous barcode scanning on video stream
     */
    startScanning(
        videoElement: HTMLVideoElement,
        onDetect: (result: BarcodeResult) => void,
        intervalMs: number = 500
    ): void {
        if (!this.detector) {
            console.warn('Cannot start scanning: detector not initialized');
            return;
        }

        if (this.isScanningSignal()) {
            console.log('Already scanning');
            return;
        }

        this.isScanningSignal.set(true);

        this.scanInterval = setInterval(async () => {
            if (!videoElement.videoWidth || videoElement.paused || videoElement.ended) {
                return;
            }

            try {
                const barcodes = await this.detector.detect(videoElement);

                if (barcodes && barcodes.length > 0) {
                    const barcode = barcodes[0];
                    const result: BarcodeResult = {
                        rawValue: barcode.rawValue,
                        format: barcode.format,
                        boundingBox: barcode.boundingBox,
                    };

                    console.log('Barcode detected:', result);
                    onDetect(result);

                    // Stop scanning after detection
                    this.stopScanning();
                }
            } catch (error) {
                console.error('Barcode detection error:', error);
            }
        }, intervalMs);

        console.log('Barcode scanning started');
    }

    /**
     * Stop barcode scanning
     */
    stopScanning(): void {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        this.isScanningSignal.set(false);
        console.log('Barcode scanning stopped');
    }

    /**
     * Single barcode detection on image
     */
    async detectOnce(
        imageSource: HTMLImageElement | HTMLVideoElement | ImageBitmap
    ): Promise<BarcodeResult | null> {
        if (!this.detector) {
            await this.initialize();
            if (!this.detector) {
                return null;
            }
        }

        try {
            const barcodes = await this.detector.detect(imageSource);
            if (barcodes && barcodes.length > 0) {
                const barcode = barcodes[0];
                return {
                    rawValue: barcode.rawValue,
                    format: barcode.format,
                    boundingBox: barcode.boundingBox,
                };
            }
            return null;
        } catch (error) {
            console.error('Barcode detection error:', error);
            return null;
        }
    }
}

