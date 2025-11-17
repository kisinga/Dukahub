import { NativeAuthenticationStrategy, PluginCommonModule, VendurePlugin } from '@vendure/core';
import { VENDURE_COMPATIBILITY_VERSION } from '../../constants/vendure-version.constants';
import { OtpTokenAuthStrategy } from './otp-token-auth.strategy';
import { OtpService } from '../../services/auth/otp.service';
import { PhoneAuthResolver, phoneAuthSchema } from './phone-auth.resolver';
import { PhoneAuthService } from '../../services/auth/phone-auth.service';
import { ChannelAccessGuardService } from '../../services/auth/channel-access-guard.service';
import { RegistrationStorageService } from '../../infrastructure/storage/registration-storage.service';
import { RegistrationService } from '../../services/auth/registration.service';
import { SmsProviderFactory } from '../../infrastructure/sms/sms-provider.factory';
import { SmsService } from '../../infrastructure/sms/sms.service';
// Registration Provisioning Services
import { AccessProvisionerService } from '../../services/auth/provisioning/access-provisioner.service';
import { ChannelAssignmentService } from '../../services/auth/provisioning/channel-assignment.service';
import { ChannelProvisionerService } from '../../services/auth/provisioning/channel-provisioner.service';
import { PaymentProvisionerService } from '../../services/auth/provisioning/payment-provisioner.service';
import { RegistrationAuditorService } from '../../services/auth/provisioning/registration-auditor.service';
import { RegistrationErrorService } from '../../services/auth/provisioning/registration-error.service';
import { RegistrationValidatorService } from '../../services/auth/provisioning/registration-validator.service';
import { RoleProvisionerService } from '../../services/auth/provisioning/role-provisioner.service';
import { StoreProvisionerService } from '../../services/auth/provisioning/store-provisioner.service';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        // SMS Provider Infrastructure
        SmsProviderFactory,
        SmsService,
        // Registration Infrastructure
        RegistrationService,
        RegistrationStorageService,
        // Registration Provisioning Services (composable)
        RegistrationValidatorService,
        RegistrationErrorService,
        RegistrationAuditorService,
        ChannelAssignmentService,
        ChannelProvisionerService,
        StoreProvisionerService,
        PaymentProvisionerService,
        RoleProvisionerService,
        AccessProvisionerService,
        // Phone Auth Infrastructure
        PhoneAuthResolver,
        PhoneAuthService,
        ChannelAccessGuardService,
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
    compatibility: VENDURE_COMPATIBILITY_VERSION,
})
export class PhoneAuthPlugin { }

