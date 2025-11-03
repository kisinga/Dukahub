import { Injectable } from '@nestjs/common';
import {
    AuthenticationStrategy,
    Injector,
    NativeAuthenticationStrategy,
    RequestContext,
    User,
    UserService,
} from '@vendure/core';
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
import { OtpService } from './otp.service';

/**
 * Custom authentication strategy that validates OTP session tokens
 * If password looks like an OTP token (starts with "otp_session_"), validate it from Redis
 * Otherwise, fall back to native authentication
 */
@Injectable()
export class OtpTokenAuthStrategy implements AuthenticationStrategy<{ username: string; password: string }> {
    name = 'native';

    private nativeStrategy?: NativeAuthenticationStrategy;
    private userService?: UserService;
    private otpService?: OtpService;
    private injector?: Injector;

    constructor(
        private readonly otpServiceInject?: OtpService,
    ) {
        // OtpService will be injected via DI if provided, otherwise we'll get it later via init()
        if (otpServiceInject) {
            this.otpService = otpServiceInject;
        }
    }

    init(injector: Injector): void {
        this.injector = injector;
        
        try {
            this.nativeStrategy = injector.get(NativeAuthenticationStrategy);
        } catch (error: any) {
            // Native strategy not available yet, will lazy initialize if needed
        }
        
        try {
            this.userService = injector.get(UserService);
        } catch (error: any) {
            // UserService not available yet, will lazy initialize if needed
        }
        
        // Get OtpService from DI container if not already set
        try {
            if (!this.otpService) {
                this.otpService = injector.get(OtpService);
            }
        } catch (error: any) {
            // OtpService not available yet, will lazy initialize if needed
        }
    }
    
    private ensureInitialized(): void {
        if (!this.injector) {
            return;
        }
        
        if (!this.nativeStrategy) {
            try {
                this.nativeStrategy = this.injector.get(NativeAuthenticationStrategy);
            } catch (error: any) {
                // Native strategy still not available
            }
        }
        
        if (!this.userService) {
            try {
                this.userService = this.injector.get(UserService);
            } catch (error: any) {
                // UserService still not available
            }
        }
        
        if (!this.otpService) {
            try {
                this.otpService = this.injector.get(OtpService);
            } catch (error: any) {
                // OtpService still not available
            }
        }
    }

    defineInputType(): DocumentNode {
        return gql`
            input NativeAuthInput {
                username: String!
                password: String!
            }
        `;
    }

    async authenticate(
        ctx: RequestContext,
        data: { username: string; password: string }
    ): Promise<User | false> {
        const { username, password } = data;

        // Ensure dependencies are initialized (lazy init if needed)
        this.ensureInitialized();

        // Only process OTP tokens, fall back to native auth for everything else
        if (!password?.startsWith('otp_session_')) {
            if (!this.nativeStrategy) {
                this.ensureInitialized();
            }
            if (!this.nativeStrategy) {
                return false;
            }
            return this.nativeStrategy.authenticate(ctx, data);
        }
        
        // If it's an OTP token but Redis isn't available, we can't authenticate
        if (!this.otpService?.redis) {
            return false;
        }

        const sessionKey = `otp:session:${password}`;

        try {
            if (!this.otpService?.redis) {
                if (!this.nativeStrategy) {
                    return false;
                }
                return this.nativeStrategy.authenticate(ctx, data);
            }
            
            const sessionData = await this.otpService.redis.get(sessionKey);

            if (!sessionData) {
                if (!this.nativeStrategy) {
                    return false;
                }
                return this.nativeStrategy.authenticate(ctx, data);
            }

            const session = JSON.parse(sessionData);
            
            if (session.phoneNumber !== username || !session.userId) {
                if (!this.nativeStrategy) {
                    return false;
                }
                return this.nativeStrategy.authenticate(ctx, data);
            }

            if (!this.userService) {
                return false;
            }

            const user = await this.userService.getUserByEmailAddress(ctx, username);
            
            if (!user || user.id.toString() !== session.userId) {
                if (!this.nativeStrategy) {
                    return false;
                }
                return this.nativeStrategy.authenticate(ctx, data);
            }

            // Token validated - delete it and return user
            if (this.otpService?.redis) {
                await this.otpService.redis.del(sessionKey);
            }
            return user;
        } catch (error) {
            if (!this.nativeStrategy) {
                return false;
            }
            return this.nativeStrategy.authenticate(ctx, data);
        }
    }
}

