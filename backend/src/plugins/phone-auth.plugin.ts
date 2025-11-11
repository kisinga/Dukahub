import { NativeAuthenticationStrategy, PluginCommonModule, VendurePlugin } from '@vendure/core';
import { OtpTokenAuthStrategy } from './otp-token-auth.strategy';
import { OtpService } from './otp.service';
import { PhoneAuthResolver, phoneAuthSchema } from './phone-auth.resolver';
import { PhoneAuthService } from './phone-auth.service';
import { RegistrationStorageService } from './registration-storage.service';
import { RegistrationService } from './registration.service';
import { SmsProviderFactory } from './sms/sms-provider.factory';
import { SmsService } from './sms/sms.service';

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

