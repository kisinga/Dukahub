import { NativeAuthenticationStrategy, PluginCommonModule, VendurePlugin } from '@vendure/core';
import { OtpTokenAuthStrategy } from './otp-token-auth.strategy';
import { OtpService } from '../../services/auth/otp.service';
import { PhoneAuthResolver, phoneAuthSchema } from './phone-auth.resolver';
import { PhoneAuthService } from '../../services/auth/phone-auth.service';
import { RegistrationStorageService } from '../../infrastructure/storage/registration-storage.service';
import { RegistrationService } from '../../services/auth/registration.service';
import { SmsProviderFactory } from '../../infrastructure/sms/sms-provider.factory';
import { SmsService } from '../../infrastructure/sms/sms.service';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        // SMS Provider Infrastructure
        SmsProviderFactory,
        SmsService,
        // Registration Infrastructure
        RegistrationService,
        RegistrationStorageService,
        // Phone Auth Infrastructure
        PhoneAuthResolver,
        PhoneAuthService,
        OtpService,
        OtpTokenAuthStrategy,
        NativeAuthenticationStrategy,
    ],
    configuration: (config: any) => {
        // Initialize array if it doesn't exist
        const existingStrategies = config.authOptions.adminAuthenticationStrategy ?? [];

        const hasNative = existingStrategies.some(
            (strategy: any) => strategy instanceof NativeAuthenticationStrategy
        );
        const nativeStrategy = hasNative ? [] : [new NativeAuthenticationStrategy()];

        // Instantiate the strategy here, before bootstrap
        // OtpService will be injected via DI during init()
        const strategy = new OtpTokenAuthStrategy();

        // Add OTP strategy before any existing ones so it gets checked first, but keep the originals intact
        config.authOptions.adminAuthenticationStrategy = [
            strategy,
            ...nativeStrategy,
            ...existingStrategies,
        ];


        return config;
    },
    adminApiExtensions: {
        resolvers: [PhoneAuthResolver],
        schema: phoneAuthSchema,
    },
    shopApiExtensions: {
        resolvers: [PhoneAuthResolver],
        schema: phoneAuthSchema,
    },
})
export class PhoneAuthPlugin { }

