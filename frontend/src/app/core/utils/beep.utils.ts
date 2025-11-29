import { ScannerBeepService } from '../services/scanner-beep.service';

// Lazy singleton instance for backward compatibility
let serviceInstance: ScannerBeepService | null = null;

/**
 * Get or create singleton ScannerBeepService instance
 * Used by utility function for backward compatibility
 * Creates instance without Angular DI (uses browser platform by default)
 */
function getServiceInstance(): ScannerBeepService {
  if (!serviceInstance) {
    // Create instance - service will detect browser platform automatically
    serviceInstance = new ScannerBeepService();
  }
  return serviceInstance;
}

/**
 * Utility function to play a barcode scanner beep sound
 *
 * @deprecated This utility function is maintained for backward compatibility.
 * For new code, inject and use ScannerBeepService directly.
 *
 * Note: Parameters are ignored - uses exact hardware specifications (2400 Hz, 50ms)
 * matching real Honeywell scanners for authentic sound.
 *
 * @param frequency - Ignored (uses 2400 Hz hardware spec)
 * @param duration - Ignored (uses 50ms hardware spec)
 * @returns Promise that resolves when beep completes or rejects if audio is unavailable
 */
export async function playBeep(frequency: number = 3000, duration: number = 100): Promise<void> {
  // Use ScannerBeepService for consistent, authentic scanner beep
  // Parameters are ignored to match exact hardware specifications
  const service = getServiceInstance();
  return service.playBeep();
}
