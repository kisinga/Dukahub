import { Injectable, signal } from '@angular/core';

/**
 * Camera stream configuration
 */
export interface CameraConfig {
  facingMode: 'user' | 'environment';
  width?: number;
  height?: number;
}

/**
 * Service for managing device camera access and video streaming
 */
@Injectable({
  providedIn: 'root',
})
export class CameraService {
  private stream: MediaStream | null = null;
  private readonly isActiveSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly isActive = this.isActiveSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /**
   * Start camera stream and attach to video element
   */
  async startCamera(
    videoElement: HTMLVideoElement,
    config: CameraConfig = { facingMode: 'environment' },
  ): Promise<boolean> {
    if (this.stream) {
      console.log('Camera already active');
      return true;
    }

    this.errorSignal.set(null);

    try {
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available. Please use HTTPS or localhost.');
      }

      // Request camera access
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: config.facingMode,
          width: config.width,
          height: config.height,
        },
        audio: false,
      };

      console.log('Requesting camera access...');
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Attach stream to video element
      videoElement.srcObject = this.stream;

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        videoElement.onloadedmetadata = () => {
          videoElement
            .play()
            .then(() => resolve())
            .catch(reject);
        };
        videoElement.onerror = () => reject(new Error('Video element error'));
      });

      this.isActiveSignal.set(true);
      console.log('Camera started successfully');
      return true;
    } catch (error: any) {
      console.error('Failed to start camera:', error);
      const errorMessage = this.getUserFriendlyError(error);
      this.errorSignal.set(errorMessage);
      this.stopCamera(videoElement);
      return false;
    }
  }

  /**
   * Stop camera stream and release resources
   */
  stopCamera(videoElement?: HTMLVideoElement): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (videoElement) {
      videoElement.srcObject = null;
    }

    this.isActiveSignal.set(false);
    console.log('Camera stopped');
  }

  /**
   * Switch between front and back camera
   */
  async switchCamera(
    videoElement: HTMLVideoElement,
    currentFacingMode: 'user' | 'environment',
  ): Promise<boolean> {
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    this.stopCamera(videoElement);
    return await this.startCamera(videoElement, { facingMode: newFacingMode });
  }

  /**
   * Check if camera is available on device
   */
  async isCameraAvailable(): Promise<boolean> {
    try {
      // Check if mediaDevices API is available (requires HTTPS or localhost)
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.warn('Camera API not available (requires HTTPS or localhost)');
        return false;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some((device) => device.kind === 'videoinput');
    } catch (error) {
      console.error('Error checking camera availability:', error);
      return false;
    }
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyError(error: any): string {
    const errorName = error.name || '';

    switch (errorName) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Camera permission denied. Please allow camera access in settings.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No camera found on this device.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'Camera is already in use by another application.';
      case 'OverconstrainedError':
      case 'ConstraintNotSatisfiedError':
        return 'Camera does not support the requested configuration.';
      case 'NotSupportedError':
        return 'Camera access is not supported in this browser.';
      case 'AbortError':
        return 'Camera access was aborted.';
      default:
        return error.message || 'Failed to access camera.';
    }
  }

  /**
   * Get current stream
   */
  getStream(): MediaStream | null {
    return this.stream;
  }
}
