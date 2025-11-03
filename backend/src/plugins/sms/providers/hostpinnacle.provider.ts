import { Injectable } from '@nestjs/common';
import { ISmsProvider, SmsResult } from '../interfaces/sms-provider.interface';

/**
 * Hostpinnacle SMS Provider
 * 
 * Implements SMS sending via Hostpinnacle SMS API
 * API Documentation: https://smsportal.hostpinnacle.co.ke/SMSApi/send
 */
@Injectable()
export class HostpinnacleProvider implements ISmsProvider {
    private readonly apiUrl: string;
    private readonly userId: string;
    private readonly password: string;
    private readonly senderId: string;

    constructor() {
        // Load configuration from environment variables
        this.apiUrl = process.env.HOSTPINNACLE_API_URL || 'https://smsportal.hostpinnacle.co.ke/SMSApi/send';
        this.userId = process.env.HOSTPINNACLE_USERID || '';
        this.password = process.env.HOSTPINNACLE_PASSWORD || '';
        this.senderId = process.env.HOSTPINNACLE_SENDER_ID || 'DUKAHUB';
    }

    getName(): string {
        return 'hostpinnacle';
    }

    isConfigured(): boolean {
        return !!(this.userId && this.password);
    }

    /**
     * Convert phone number from 07XXXXXXXX to 2547XXXXXXXX format
     * Hostpinnacle expects format: 254xxxxxxxxx (without +)
     */
    private formatPhoneForHostpinnacle(phoneNumber: string): string {
        let cleanPhone = phoneNumber.trim();

        // Remove leading + if present
        if (cleanPhone.startsWith('+')) {
            cleanPhone = cleanPhone.substring(1);
        }

        // Convert 07XXXXXXXX to 2547XXXXXXXX
        if (cleanPhone.startsWith('07')) {
            cleanPhone = '254' + cleanPhone.substring(1);
        } else if (!cleanPhone.startsWith('254')) {
            throw new Error(`Invalid phone number format for Hostpinnacle SMS: ${phoneNumber}. Expected format: 07XXXXXXXX or 2547XXXXXXXX`);
        }

        return cleanPhone;
    }

    async sendSms(phoneNumber: string, message: string): Promise<SmsResult> {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: 'Hostpinnacle SMS credentials not configured',
            };
        }

        try {
            // Format phone number for Hostpinnacle API
            const formattedPhone = this.formatPhoneForHostpinnacle(phoneNumber);

            // Prepare form data for Hostpinnacle API
            const formData = new FormData();
            formData.append('userid', this.userId);
            formData.append('password', this.password);
            formData.append('mobile', formattedPhone);
            formData.append('senderid', this.senderId);
            formData.append('msg', message);
            formData.append('sendMethod', 'quick');
            formData.append('msgType', 'text');
            formData.append('output', 'json');
            formData.append('duplicatecheck', 'true');

            // Send SMS via Hostpinnacle API
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            // Check for API errors
            if (result.status === 'error' || result.statusCode !== '200') {
                return {
                    success: false,
                    error: result.reason || result.message || 'Failed to send SMS via Hostpinnacle',
                    metadata: {
                        apiResponse: result,
                    },
                };
            }

            // Success
            return {
                success: true,
                messageId: result.messageId || result.id || undefined,
                metadata: {
                    apiResponse: result,
                    formattedPhone,
                },
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return {
                success: false,
                error: `Hostpinnacle SMS error: ${errorMessage}`,
                metadata: {
                    originalError: error,
                },
            };
        }
    }
}

