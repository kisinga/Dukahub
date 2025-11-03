import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { PhoneAuthResolver, phoneAuthSchema } from './phone-auth.resolver';
import { PhoneAuthService } from './phone-auth.service';
import { OtpService } from './otp.service';
import { OtpTokenAuthStrategy } from './otp-token-auth.strategy';
import { SmsService } from './sms/sms.service';
import { SmsProviderFactory } from './sms/sms-provider.factory';
import { HostpinnacleProvider } from './sms/providers/hostpinnacle.provider';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        // SMS Provider Infrastructure
        HostpinnacleProvider,
        SmsProviderFactory,
        SmsService,
        // Phone Auth Infrastructure
        PhoneAuthResolver,
        PhoneAuthService,
        OtpService,
        OtpTokenAuthStrategy,
    ],
    configuration: (config: any) => {
        // Initialize array if it doesn't exist
        if (!config.authOptions.adminAuthenticationStrategy) {
            config.authOptions.adminAuthenticationStrategy = [];
        }
        
        // Instantiate the strategy here, before bootstrap
        // OtpService will be injected via DI during init()
        const strategy = new OtpTokenAuthStrategy();
        
        // Add strategy at the beginning so it's found first by getAuthenticationStrategy's find()
        // Since both our strategy and NativeAuthenticationStrategy have name='native',
        // we MUST be first in the array or the native strategy will be used instead
        config.authOptions.adminAuthenticationStrategy.unshift(strategy);
        
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
export class PhoneAuthPlugin {}

