import { Injectable } from '@nestjs/common';
import { RequestContext } from '@vendure/core';
import { formatPhoneNumber } from '../../utils/phone.utils';
import { AccessProvisionerService } from './provisioning/access-provisioner.service';
import { ChannelProvisionerService } from './provisioning/channel-provisioner.service';
import { PaymentProvisionerService } from './provisioning/payment-provisioner.service';
import { RegistrationErrorService } from './provisioning/registration-error.service';
import { RegistrationValidatorService } from './provisioning/registration-validator.service';
import { RoleProvisionerService } from './provisioning/role-provisioner.service';
import { StoreProvisionerService } from './provisioning/store-provisioner.service';

/**
 * Registration Input Data
 */
export interface RegistrationInput {
    companyName: string;
    companyCode: string;
    currency: string;
    adminFirstName: string;
    adminLastName: string;
    adminPhoneNumber: string;
    adminEmail?: string;
    storeName: string;
    storeAddress?: string;
}

/**
 * Provision Result
 */
export interface ProvisionResult {
    channelId: string;
    stockLocationId: string;
    roleId: string;
    adminId: string;
    userId: string;
}

/**
 * Registration Service (Orchestrator)
 * 
 * Coordinates customer registration provisioning flow.
 * Delegates to specialized provisioner services following LOB (Line of Business) boundaries:
 * 
 * - Channel: Company workspace/tenant
 * - Store: Physical location (stock location)
 * - Payment: Payment processing capabilities
 * - Role: Access control and permissions
 * - Access: User authentication and authorization
 * 
 * NOTE: This service's `provisionCustomer` method is designed to be called
 * within a transaction (via `connection.withTransaction`). All database operations
 * within this method will be part of that transaction, ensuring atomicity.
 * 
 * IMPORTANT: This service does NOT create Customer entities.
 * The registered user is a channel-scoped Administrator (not superadmin).
 * 
 * NOTE: Registration is passwordless - uses OTP for authentication.
 * A secure random password is generated internally to satisfy Vendure's requirements
 * but is never used for authentication (passwordless auth via OTP).
 */
@Injectable()
export class RegistrationService {
    constructor(
        private readonly validator: RegistrationValidatorService,
        private readonly channelProvisioner: ChannelProvisionerService,
        private readonly storeProvisioner: StoreProvisionerService,
        private readonly paymentProvisioner: PaymentProvisionerService,
        private readonly roleProvisioner: RoleProvisionerService,
        private readonly accessProvisioner: AccessProvisionerService,
        private readonly errorService: RegistrationErrorService,
    ) { }

    /**
     * Provision customer entities (Channel, Stock Location, Payment Methods, Role, Admin)
     * 
     * Entity creation order (critical, must follow this sequence):
     * 1. Validate input (currency, channel code uniqueness, zones)
     * 2. Create Channel (company workspace) - requires zones from default channel
     * 3. Create Store (stock location) and assign to channel
     * 4. Create Payment Methods (Cash + M-Pesa) and assign to channel
     * 5. Create Role (access control) with all permissions and assign to channel
     * 6. Create Access (user + administrator) with role assignment
     * 
     * All operations run within a transaction for atomicity.
     */
    async provisionCustomer(
        ctx: RequestContext,
        registrationData: RegistrationInput
    ): Promise<ProvisionResult> {
        try {
            // Normalize phone number at the very start for consistent usage
            const formattedPhone = formatPhoneNumber(registrationData.adminPhoneNumber);

            // Step 1: Validate input (currency, channel code, zones)
            console.log('[RegistrationService] Validating registration input');
            await this.validator.validateInput(ctx, registrationData);
            const defaultChannel = await this.validator.getDefaultChannel(ctx);

            // Step 2: Create Channel (company workspace)
            console.log('[RegistrationService] Creating channel:', registrationData.companyCode);
            const channel = await this.channelProvisioner.createChannel(
                ctx,
                registrationData,
                defaultChannel,
                formattedPhone
            );
            console.log('[RegistrationService] Channel created:', channel.id, 'Token:', channel.token);

            // Step 3: Create Store (stock location) and assign to channel
            console.log('[RegistrationService] Creating store:', registrationData.storeName);
            const stockLocation = await this.storeProvisioner.createAndAssignStore(
                ctx,
                registrationData,
                channel.id.toString()
            );
            console.log('[RegistrationService] Store created and assigned:', stockLocation.id);

            // Step 4: Create Payment Methods and assign to channel
            console.log('[RegistrationService] Creating payment methods for channel:', channel.id);
            const paymentMethods = await this.paymentProvisioner.createAndAssignPaymentMethods(
                ctx,
                channel.id.toString(),
                registrationData.companyCode
            );
            console.log('[RegistrationService] Payment methods created and assigned:', paymentMethods.length);

            // Step 5: Create Role (access control) with all permissions
            console.log('[RegistrationService] Creating admin role for channel:', channel.id);
            const role = await this.roleProvisioner.createAdminRole(
                ctx,
                registrationData,
                channel.id
            );
            console.log('[RegistrationService] Admin role created:', role.id, 'Code:', role.code);

            // Step 6: Create Access (user + administrator) with role
            console.log('[RegistrationService] Creating administrator with role:', role.id);
            const administrator = await this.accessProvisioner.createAdministrator(
                ctx,
                registrationData,
                role,
                formattedPhone
            );
            console.log('[RegistrationService] Administrator created:', administrator.id);

            // Verify all required entities were created
            if (!administrator.user) {
                throw this.errorService.createError('PROVISIONING_FAILED', 'Failed to create administrator user');
            }

            const result = {
                channelId: channel.id.toString(),
                stockLocationId: stockLocation.id.toString(),
                roleId: role.id.toString(),
                adminId: administrator.id.toString(),
                userId: administrator.user.id.toString(),
            };

            console.log('[RegistrationService] Provisioning complete:', result);
            return result;
        } catch (error: any) {
            this.errorService.logError('RegistrationService', error, 'Provisioning');
            throw this.errorService.wrapError(error, 'PROVISIONING_FAILED');
        }
    }
}

