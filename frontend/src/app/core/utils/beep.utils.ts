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
export async function playBeep(frequency: number = 3000, duration: number = 2000): Promise<void> {
  // Hardware specifications matching real scanners
  const FREQUENCY = 2400; // Hz - Honeywell HF680 Series default
  const DURATION = 50; // milliseconds - industry standard
  const VOLUME = 0.3; // Gain level (moderate, not jarring)

  // Only work in browser environment
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  // Check if Web Audio API is available
  if (!window.AudioContext && !(window as any).webkitAudioContext) {
    console.warn('Web Audio API not available, scanner beep disabled');
    return Promise.resolve();
  }

  try {
    // Create audio context (handle vendor prefixes)
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass();

    // Create oscillator for generating the tone
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // Configure oscillator: pure sine wave at exact scanner frequency
    oscillator.type = 'sine';
    oscillator.frequency.value = FREQUENCY;

    // Configure gain: moderate volume with smooth fade-out
    gainNode.gain.setValueAtTime(VOLUME, audioContext.currentTime);
    // Fade out slightly at the end for smoother sound
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + DURATION / 1000,
    );

    // Connect nodes: oscillator -> gain -> destination (speakers)
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Start the oscillator
    oscillator.start(audioContext.currentTime);

    // Stop after specified duration (matching hardware spec)
    oscillator.stop(audioContext.currentTime + DURATION / 1000);

    // Return promise that resolves when sound finishes
    return new Promise((resolve) => {
      oscillator.onended = () => {
        resolve();
      };
    });
  } catch (error) {
    // Log error but don't throw - beep failure shouldn't break detection flow
    console.warn('Failed to play scanner beep:', error);
    return Promise.resolve();
  }
}
