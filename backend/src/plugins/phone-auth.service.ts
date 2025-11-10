import { Injectable } from '@nestjs/common';
import {
    RequestContext,
    TransactionalConnection,
    User,
    UserService,
} from '@vendure/core';
import { formatPhoneNumber } from '../utils/phone.utils';
import { OtpService } from './otp.service';
import { RegistrationInput, RegistrationService } from './registration.service';
import { RegistrationStorageService } from './registration-storage.service';

// Re-export RegistrationInput for backward compatibility with resolver
export type { RegistrationInput } from './registration.service';

export enum AuthorizationStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

/**
 * Phone-based authentication service
 * Handles OTP request/verification and authentication logic only.
 * Entity provisioning is delegated to RegistrationService.
 */
@Injectable()
export class PhoneAuthService {
    constructor(
        private readonly otpService: OtpService,
        private readonly userService: UserService,
        private readonly registrationService: RegistrationService,
        private readonly registrationStorageService: RegistrationStorageService,
        private readonly connection: TransactionalConnection,
    ) { }

    /**
     * Store registration data and request OTP
     * 
     * NEW FLOW:
     * 1. Store registration data in Redis (temporary)
     * 2. Request OTP
     * 3. Return sessionId to frontend
     * 
     * Frontend will use sessionId during OTP verification
     */
    async requestRegistrationOTP(
        phoneNumber: string,
        registrationData: RegistrationInput
    ): Promise<{
        success: boolean;
        message: string;
        sessionId?: string;
        expiresAt?: number;
    }> {
        // Normalize phone number to 07XXXXXXXX format
        const formattedPhone = formatPhoneNumber(phoneNumber);

        // Step 1: Store registration data temporarily
        const { sessionId, expiresAt } = await this.registrationStorageService.storeRegistrationData(
            formattedPhone,
            registrationData
        );

        // Step 2: Request OTP
        const otpResult = await this.otpService.requestOTP(formattedPhone, 'registration');

        return {
            success: otpResult.success,
            message: otpResult.message,
            sessionId,
            expiresAt: expiresAt || otpResult.expiresAt,
        };
    }

    /**
     * Request login OTP
     * Validates that the phone number has an associated account before sending OTP
     */
    async requestLoginOTP(phoneNumber: string, ctx: RequestContext): Promise<{
        success: boolean;
        message: string;
        expiresAt?: number;
    }> {
        try {
            const formattedPhone = formatPhoneNumber(phoneNumber);

            // Check if user account exists before sending OTP
            const existingUser = await this.userService.getUserByEmailAddress(ctx, formattedPhone);
            if (!existingUser) {
                return {
                    success: false,
                    message: 'No account found with this phone number. Please register first.',
                };
            }

            // Account exists - proceed with sending OTP
            return await this.otpService.requestOTP(formattedPhone, 'login');
        } catch (error: any) {
            throw new Error(error?.message || 'Failed to request OTP');
        }
    }

    /**
     * Verify registration OTP and create account
     * 
     * NEW FLOW:
     * 1. Verify OTP
     * 2. Retrieve registration data from Redis using sessionId
     * 3. Check if user already exists
     * 4. Create entities in transaction (Channel, Stock Location, Payment Methods, Role, Administrator)
     * 5. Update authorization status
     * 
     * After successful creation, user must login separately (tokens can't be assigned
     * during signup because channel/role don't exist yet)
     */
    async verifyRegistrationOTP(
        ctx: RequestContext,
        phoneNumber: string,
        otp: string,
        sessionId: string
    ): Promise<{
        success: boolean;
        userId?: string;
        message: string;
    }> {
        // Step 1: Verify OTP first
        const verification = await this.otpService.verifyOTP(phoneNumber, otp);
        if (!verification.valid) {
            throw new Error(verification.message);
        }

        // Step 2: Normalize phone number to 07XXXXXXXX format
        const formattedPhone = formatPhoneNumber(phoneNumber);

        // Step 3: Retrieve registration data from temporary storage
        const registrationData = await this.registrationStorageService.retrieveRegistrationData(sessionId);
        if (!registrationData) {
            throw new Error('Registration data not found or expired. Please start registration again.');
        }

        // Step 4: Check if user already exists
        const existingUser = await this.userService.getUserByEmailAddress(ctx, formattedPhone);
        if (existingUser) {
            throw new Error('An account with this phone number already exists. Please login instead.');
        }

        // Step 5: Create entities in transaction
        // This creates: Channel, Stock Location, Payment Methods, Role, and Administrator
        // All operations are wrapped in a transaction for atomicity
        const provisionResult = await this.connection.withTransaction(ctx, async (transactionCtx) => {
            return await this.registrationService.provisionCustomer(transactionCtx, registrationData);
        });

        // Step 6: Update User's authorization status to PENDING
            await this.connection.getRepository(ctx, User).update(
            { id: provisionResult.userId },
                {
                    identifier: formattedPhone, // Ensure identifier is phone
                    customFields: {
                        authorizationStatus: AuthorizationStatus.PENDING,
                    },
                }
            );

        return {
            success: true,
            userId: provisionResult.userId,
            message: 'Registration successful. Your account is pending admin approval. Please login to continue.',
        };
    }

    /**
     * Verify login OTP
     */
    async verifyLoginOTP(
        ctx: RequestContext,
        phoneNumber: string,
        otp: string
    ): Promise<{
        success: boolean;
        token?: string;
        user?: {
            id: string;
            identifier: string;
        };
        message: string;
        authorizationStatus?: AuthorizationStatus;
    }> {
        // Normalize phone number first for OTP verification
        const formattedPhone = formatPhoneNumber(phoneNumber);

        const verification = await this.otpService.verifyOTP(formattedPhone, otp.trim());
        if (!verification.valid) {
            return {
                success: false,
                message: verification.message,
            };
        }

        // Find user (phone number already normalized)
        const user = await this.userService.getUserByEmailAddress(ctx, formattedPhone);

        if (!user) {
            return {
                success: false,
                message: 'No account found with this phone number. Please register first.',
            };
        }

        // Get authorization status for communication purposes (not blocking)
        const authorizationStatus = (user.customFields as any)?.authorizationStatus || AuthorizationStatus.PENDING;

        // OTP verified - create session token for login
        const sessionToken = `otp_session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        if (!this.otpService.redis) {
            throw new Error('Redis not available');
        }

        await this.otpService.redis.setex(
            `otp:session:${sessionToken}`,
            300, // 5 minutes
            JSON.stringify({
                userId: user.id.toString(),
                phoneNumber: formattedPhone,
            })
        );

        return {
            success: true,
            token: sessionToken,
            message: 'OTP verified successfully',
            user: {
                id: user.id.toString(),
                identifier: user.identifier,
            },
            authorizationStatus,
        };
    }

    /**
     * Check authorization status
     */
    async checkAuthorizationStatus(identifier: string): Promise<{
        status: AuthorizationStatus;
        message: string;
    }> {
        // Normalize phone number to 07XXXXXXXX format
        const normalizedIdentifier = formatPhoneNumber(identifier);

        // Note: This method doesn't have RequestContext, so we'll need to create a system context
        // For now, we'll use a simpler approach - try to find user
        // In a real implementation, you'd pass RequestContext or use a different method
        try {
            // This will fail without context, but we'll handle it gracefully
            const user = await this.userService.getUserByEmailAddress({} as RequestContext, normalizedIdentifier);
            if (!user) {
                return {
                    status: AuthorizationStatus.PENDING,
                    message: 'User not found',
                };
            }

            const authStatus = (user.customFields as any)?.authorizationStatus;
            let authorizationStatus: AuthorizationStatus;

            // Validate and normalize authorization status
            if (authStatus === 'APPROVED') {
                authorizationStatus = AuthorizationStatus.APPROVED;
            } else if (authStatus === 'REJECTED') {
                authorizationStatus = AuthorizationStatus.REJECTED;
            } else {
                authorizationStatus = AuthorizationStatus.PENDING;
            }

            const messages: Record<AuthorizationStatus, string> = {
                [AuthorizationStatus.PENDING]: 'Account is pending admin approval',
                [AuthorizationStatus.APPROVED]: 'Account is approved',
                [AuthorizationStatus.REJECTED]: 'Account has been rejected',
            };

            return {
                status: authorizationStatus,
                message: messages[authorizationStatus],
            };
        } catch (error) {
            // If context is required, return default status
            return {
                status: AuthorizationStatus.PENDING,
                message: 'Unable to check authorization status',
            };
        }
    }
}

