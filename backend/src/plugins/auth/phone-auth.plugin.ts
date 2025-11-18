import { NativeAuthenticationStrategy, PluginCommonModule, VendurePlugin } from '@vendure/core';
import { VENDURE_COMPATIBILITY_VERSION } from '../../constants/vendure-version.constants';
import { SmsProviderFactory } from '../../infrastructure/sms/sms-provider.factory';
import { SmsService } from '../../infrastructure/sms/sms.service';
import { RegistrationStorageService } from '../../infrastructure/storage/registration-storage.service';
import { ChannelAccessGuardService } from '../../services/auth/channel-access-guard.service';
import { OtpService } from '../../services/auth/otp.service';
import { PhoneAuthService } from '../../services/auth/phone-auth.service';
import { RegistrationService } from '../../services/auth/registration.service';
import { OtpTokenAuthStrategy } from './otp-token-auth.strategy';
import { PhoneAuthResolver, phoneAuthSchema } from './phone-auth.resolver';
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
        // Note: Authentication strategies are configured via config.authOptions.adminAuthenticationStrategy
        // in the configuration() hook below, not via DI providers, to keep the source of truth in one place.
    ],
    configuration: (config: any) => {
        const existingStrategies = config.authOptions.adminAuthenticationStrategy ?? [];

        const hasOtp = existingStrategies.some(
            (strategy: any) => strategy instanceof OtpTokenAuthStrategy
        );
        const hasNative = existingStrategies.some(
            (strategy: any) => strategy instanceof NativeAuthenticationStrategy
        );

        const strategies: any[] = [];

        // OtpTokenAuthStrategy wraps native auth and logs both OTP and non-OTP admin logins.
        // It must appear before the plain NativeAuthenticationStrategy so it can inspect the
        // password and delegate appropriately.
        if (!hasOtp) {
            strategies.push(new OtpTokenAuthStrategy());
        }

        if (!hasNative) {
            strategies.push(new NativeAuthenticationStrategy());
        }

        config.authOptions.adminAuthenticationStrategy = [
            ...strategies,
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

