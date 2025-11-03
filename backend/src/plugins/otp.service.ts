import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { formatPhoneNumber } from '../utils/phone.utils';
import { SmsService } from './sms/sms.service';

/**
 * OTP Service
 * Generates, stores, validates, and sends OTP codes via SMS
 * Uses Redis for fast, short-lived OTP storage
 */
@Injectable()
export class OtpService implements OnModuleInit, OnModuleDestroy {
    public redis: Redis | null = null; // Public for access by auth strategy

    // Configuration
    private readonly OTP_LENGTH = 6;
    private readonly OTP_EXPIRY_SECONDS = 5 * 60; // 5 minutes
    private readonly MAX_ATTEMPTS = 3;
    // Rate limiting - relaxed in development (default to dev if not explicitly production)
    // Check both NODE_ENV and explicit env vars for production mode
    private readonly IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.ENVIRONMENT === 'production';
    private readonly RATE_LIMIT_COUNT = this.IS_PRODUCTION ? 10 : 30;
    private readonly RATE_LIMIT_WINDOW_SECONDS = this.IS_PRODUCTION ? 15 * 60 : 30; // 15 min prod, 30 sec dev

    constructor(private readonly smsService: SmsService) { }

    async onModuleInit() {
        // Initialize Redis connection (non-blocking - don't wait for connection)
        // Environment variables are loaded by vendure-config.ts (same pattern as DB config)
        const redisHost = process.env.REDIS_HOST;
        const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379;

        try {
            this.redis = new Redis({
                host: redisHost,
                port: redisPort,
                connectTimeout: 5000, // 5 second timeout for initial connection
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
                maxRetriesPerRequest: 3,
                lazyConnect: false, // Connect immediately but don't block
                enableReadyCheck: false, // Don't wait for ready state
            });

            this.redis.on('error', (error) => {
                console.error('Redis connection error:', error);
            });

            this.redis.on('connect', () => {
                console.log('✅ Redis connected for OTP storage');
            });

            // Test connection asynchronously - don't block module init
            // Connection will be verified on first use
            setImmediate(async () => {
                try {
                    await this.redis?.ping();
                    console.log('✅ Redis connection verified');
                } catch (pingError) {
                    console.warn('⚠️ Redis ping failed:', pingError);
                    console.warn('OTP service will retry on first use');
                }
            });
        } catch (error) {
            console.error('Failed to initialize Redis:', error);
            console.warn('OTP service will use in-memory storage (not recommended for production)');
            this.redis = null;
        }
    }

    async onModuleDestroy() {
        if (this.redis) {
            await this.redis.quit();
        }
    }

    /**
     * Generate a random 6-digit OTP code
     */
    private generateOTP(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Get Redis key for OTP storage
     */
    private getOTPKey(phoneNumber: string): string {
        return `otp:phone:${phoneNumber}`;
    }

    /**
     * Get Redis key for rate limiting
     */
    private getRateLimitKey(phoneNumber: string): string {
        return `otp:rate:${phoneNumber}`;
    }

    /**
     * Get Redis key for OTP attempts
     */
    private getAttemptsKey(phoneNumber: string): string {
        return `otp:attempts:${phoneNumber}`;
    }

    /**
     * Check if phone number is rate limited
     */
    private async isRateLimited(phoneNumber: string): Promise<boolean> {
        if (!this.redis) return false;

        try {
            const key = this.getRateLimitKey(phoneNumber);
            const count = await this.redis.get(key);

            if (!count) {
                return false;
            }

            const countNum = parseInt(count, 10);
            if (countNum >= this.RATE_LIMIT_COUNT) {
                const ttl = await this.redis.ttl(key);
                const remainingMinutes = Math.ceil(ttl / 60);
                throw new Error(`Too many requests. Please try again in ${remainingMinutes} minute(s).`);
            }

            return false;
        } catch (error) {
            if (error instanceof Error && error.message.includes('Too many requests')) {
                throw error;
            }
            console.error('Rate limit check error:', error);
            return false;
        }
    }

    /**
     * Update rate limit counter
     */
    private async updateRateLimit(phoneNumber: string): Promise<void> {
        if (!this.redis) return;

        try {
            const key = this.getRateLimitKey(phoneNumber);
            const count = await this.redis.incr(key);

            if (count === 1) {
                // Set expiry on first request
                await this.redis.expire(key, this.RATE_LIMIT_WINDOW_SECONDS);
            }
        } catch (error) {
            console.error('Rate limit update error:', error);
        }
    }

    /**
     * Send SMS via configured SMS provider
     * Uses SmsService abstraction layer for provider-agnostic SMS sending
     */
    private async sendSMS(phoneNumber: string, message: string): Promise<void> {
        try {
            const result = await this.smsService.sendSms(phoneNumber, message);

            if (!result.success) {
                // Log error but don't throw - OTP is still generated, just SMS failed
                // This allows OTP generation to continue even if SMS provider is unavailable
                console.error('[OTP SERVICE] Failed to send SMS:', result.error);

                // Log OTP in development for testing purposes
                if (!this.IS_PRODUCTION) {
                    console.warn('[OTP SERVICE] SMS not sent. OTP code:', message.match(/\d{6}/)?.[0] || 'N/A');
                }
            }
        } catch (error) {
            console.error('[OTP SERVICE] SMS sending error:', error);
            // Don't throw - OTP is still generated, just log the error
            // In production, you might want to throw here or use a fallback method
        }
    }

    /**
     * Request OTP for phone number
     */
    async requestOTP(phoneNumber: string, purpose: 'registration' | 'login' = 'login'): Promise<{
        success: boolean;
        message: string;
        expiresAt?: number;
    }> {
        const normalizedPhone = formatPhoneNumber(phoneNumber);
        phoneNumber = normalizedPhone;

        await this.isRateLimited(phoneNumber);

        const otpCode = this.generateOTP();
        const expiresAt = Date.now() + (this.OTP_EXPIRY_SECONDS * 1000);

        if (this.redis) {
            try {
                const otpKey = this.getOTPKey(phoneNumber);
                const attemptsKey = this.getAttemptsKey(phoneNumber);

                await this.redis.setex(otpKey, this.OTP_EXPIRY_SECONDS, otpCode);
                await this.redis.setex(attemptsKey, this.OTP_EXPIRY_SECONDS, '0');
            } catch (error) {
                console.error('[OTP SERVICE] Failed to store OTP:', error);
                throw new Error('Failed to generate OTP. Please try again.');
            }
        }

        await this.updateRateLimit(phoneNumber);

        const message = `Your Dukahub verification code is: ${otpCode}. Valid for 5 minutes.`;
        await this.sendSMS(phoneNumber, message);

        return {
            success: true,
            message: 'OTP sent successfully',
            expiresAt: Math.floor(expiresAt / 1000),
        };
    }

    /**
     * Verify OTP code
     */
    async verifyOTP(phoneNumber: string, otp: string): Promise<{
        valid: boolean;
        message: string;
    }> {
        // Normalize phone number to 07XXXXXXXX format
        const normalizedPhone = formatPhoneNumber(phoneNumber);
        phoneNumber = normalizedPhone;

        if (!this.redis) {
            return {
                valid: false,
                message: 'OTP service unavailable. Please try again.',
            };
        }

        try {
            const otpKey = this.getOTPKey(phoneNumber);
            const attemptsKey = this.getAttemptsKey(phoneNumber);

            // Get stored OTP
            const storedOTP = await this.redis.get(otpKey);

            if (!storedOTP) {
                return {
                    valid: false,
                    message: 'OTP not found. Please request a new OTP.',
                };
            }

            // Check attempts
            const attempts = parseInt(await this.redis.get(attemptsKey) || '0', 10);
            if (attempts >= this.MAX_ATTEMPTS) {
                // Delete OTP after max attempts
                await this.redis.del(otpKey);
                await this.redis.del(attemptsKey);
                return {
                    valid: false,
                    message: 'Maximum verification attempts exceeded. Please request a new OTP.',
                };
            }

            const enteredOTP = otp.trim();
            const storedOTPTrimmed = storedOTP.trim();

            if (storedOTPTrimmed !== enteredOTP) {
                // Increment attempts
                await this.redis.incr(attemptsKey);
                const remainingAttempts = this.MAX_ATTEMPTS - (attempts + 1);

                if (remainingAttempts <= 0) {
                    await this.redis.del(otpKey);
                    await this.redis.del(attemptsKey);
                    return {
                        valid: false,
                        message: 'Invalid OTP. Maximum attempts exceeded. Please request a new OTP.',
                    };
                }

                return {
                    valid: false,
                    message: `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`,
                };
            }

            // Success - delete OTP and attempts
            await this.redis.del(otpKey);
            await this.redis.del(attemptsKey);

            return {
                valid: true,
                message: 'OTP verified successfully',
            };
        } catch (error) {
            console.error('[OTP SERVICE] OTP verification error:', error);
            return {
                valid: false,
                message: 'OTP verification failed. Please try again.',
            };
        }
    }

    /**
     * Get remaining time until rate limit resets (in seconds)
     */
    async getRateLimitRemaining(phoneNumber: string): Promise<number> {
        if (!this.redis) return 0;

        try {
            const key = this.getRateLimitKey(phoneNumber);
            const ttl = await this.redis.ttl(key);
            return Math.max(0, ttl);
        } catch (error) {
            console.error('Rate limit remaining check error:', error);
            return 0;
        }
    }

    /**
     * Get OTP expiry time remaining (in seconds)
     */
    async getOTPExpiryRemaining(phoneNumber: string): Promise<number> {
        if (!this.redis) return 0;

        try {
            const key = this.getOTPKey(phoneNumber);
            const ttl = await this.redis.ttl(key);
            return Math.max(0, ttl);
        } catch (error) {
            console.error('OTP expiry check error:', error);
            return 0;
        }
    }
}

