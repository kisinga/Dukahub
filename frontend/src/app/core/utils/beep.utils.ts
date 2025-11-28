/**
 * Utility function to play a barcode scanner-like beep sound
 * Uses Web Audio API to generate a 3 kHz tone for 100ms
 */

/**
 * Plays a beep sound similar to supermarket barcode scanners
 * @param frequency - Frequency in Hz (default: 3000 Hz / 3 kHz)
 * @param duration - Duration in milliseconds (default: 100ms)
 * @returns Promise that resolves when beep completes or rejects if audio is unavailable
 */
export async function playBeep(frequency: number = 3000, duration: number = 100): Promise<void> {
  // Check if Web Audio API is available
  if (
    typeof window === 'undefined' ||
    (!window.AudioContext && !(window as any).webkitAudioContext)
  ) {
    console.warn('Web Audio API not available, beep sound disabled');
    return Promise.resolve();
  }

  try {
    // Create audio context (handle vendor prefixes)
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass();

    // Create oscillator node for generating the tone
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // Configure oscillator: sine wave at specified frequency
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    // Configure gain: moderate volume (0.3 = 30% volume)
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    // Fade out slightly at the end for smoother sound
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

    // Connect nodes: oscillator -> gain -> destination (speakers)
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Start the oscillator
    oscillator.start(audioContext.currentTime);

    // Stop after specified duration
    oscillator.stop(audioContext.currentTime + duration / 1000);

    // Return promise that resolves when sound finishes
    return new Promise((resolve) => {
      oscillator.onended = () => {
        // Clean up audio context if no other sounds are playing
        // Note: We don't close the context immediately as it may be reused
        resolve();
      };
    });
  } catch (error) {
    // Log error but don't throw - beep failure shouldn't break product detection
    console.warn('Failed to play beep sound:', error);
    return Promise.resolve();
  }
}
