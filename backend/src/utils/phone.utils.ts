/**
 * Phone number utilities for Kenyan phone numbers
 * 
 * Standard format: 07XXXXXXXX (10 digits starting with 07)
 * - Input can accept: 07XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX, 7XXXXXXXX
 * - Storage/Output: Always normalized to 07XXXXXXXX
 */

/**
 * Normalize a phone number to standard format: 07XXXXXXXX
 * 
 * Accepts various input formats:
 * - 07XXXXXXXX (already correct)
 * - +2547XXXXXXXX (international format)
 * - 2547XXXXXXXX (international without +)
 * - 7XXXXXXXX (missing leading 0)
 * 
 * @param phoneNumber - Phone number in any format
 * @returns Normalized phone number in format 07XXXXXXXX
 * @throws Error if phone number cannot be normalized
 */
export function formatPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
        throw new Error('Phone number is required');
    }

    // Remove all whitespace and non-digit characters except + at the start
    let cleaned = phoneNumber.trim().replace(/[\s-]/g, '');
    
    // Remove leading + if present
    if (cleaned.startsWith('+')) {
        cleaned = cleaned.substring(1);
    }

    // Handle different formats:
    // +2547XXXXXXXX or 2547XXXXXXXX -> 07XXXXXXXX
    if (cleaned.startsWith('254') && cleaned.length === 12) {
        cleaned = '0' + cleaned.substring(3);
    }
    // 7XXXXXXXX -> 07XXXXXXXX (if missing leading 0)
    else if (cleaned.startsWith('7') && cleaned.length === 9) {
        cleaned = '0' + cleaned;
    }
    // 07XXXXXXXX -> already correct
    else if (cleaned.startsWith('07') && cleaned.length === 10) {
        // Already in correct format
    }
    // If already 10 digits but doesn't start with 07, try to fix
    else if (cleaned.length === 10 && !cleaned.startsWith('07')) {
        throw new Error(`Phone number must start with 07. Received: ${phoneNumber}`);
    }
    // Invalid length
    else {
        throw new Error(`Invalid phone number format. Expected 07XXXXXXXX (10 digits). Received: ${phoneNumber}`);
    }

    // Final validation: must be exactly 10 digits starting with 07
    if (!/^07\d{8}$/.test(cleaned)) {
        throw new Error(`Phone number must be in format 07XXXXXXXX (10 digits starting with 07). Received: ${phoneNumber}`);
    }

    return cleaned;
}

/**
 * Validate if a phone number is in the correct format: 07XXXXXXXX
 * 
 * @param phoneNumber - Phone number to validate
 * @returns true if valid, false otherwise
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
        return false;
    }

    try {
        const normalized = formatPhoneNumber(phoneNumber);
        return /^07\d{8}$/.test(normalized);
    } catch {
        return false;
    }
}


















