import { Injectable, Optional } from '@nestjs/common';
import {
    Administrator,
    AdministratorService,
    Channel,
    ChannelService,
    CurrencyCode,
    ID,
    LanguageCode,
    PasswordCipher,
    PaymentMethod,
    PaymentMethodService,
    Permission,
    RequestContext,
    Role,
    RoleService,
    StockLocation,
    StockLocationService,
    TransactionalConnection,
    User,
    UserService,
} from '@vendure/core';
import { formatPhoneNumber } from '../utils/phone.utils';
import { ChannelEventRouterService } from './channel-events/channel-event-router.service';
import { ActionCategory } from './channel-events/types/action-category.enum';
import { ChannelEventType } from './channel-events/types/event-type.enum';

/**
 * NOTE: This service's `provisionCustomer` method is designed to be called
 * within a transaction (via `connection.withTransaction`). All database operations
 * within this method will be part of that transaction, ensuring atomicity.
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

export interface ProvisionResult {
    channelId: string;
    stockLocationId: string;
    roleId: string;
    adminId: string;
    userId: string;
}

/**
 * Registration Service
 * 
 * Handles entity provisioning for new customer registrations.
 * Creates Channel, Stock Location, Payment Methods, Role, and Administrator.
 * 
 * IMPORTANT: This service does NOT create Customer entities.
 * The registered user is a channel-scoped Administrator (not superadmin).
 */
@Injectable()
export class RegistrationService {
    constructor(
        private readonly channelService: ChannelService,
        private readonly stockLocationService: StockLocationService,
        private readonly paymentMethodService: PaymentMethodService,
        private readonly roleService: RoleService,
        private readonly administratorService: AdministratorService,
        private readonly userService: UserService,
        private readonly connection: TransactionalConnection,
        private readonly passwordCipher: PasswordCipher,
        @Optional() private readonly eventRouter?: ChannelEventRouterService, // Optional to avoid circular dependency
    ) { }

    /**
     * Provision customer entities (Channel, Stock Location, Payment Methods, Role, Admin)
     * 
     * Entity creation order (critical):
     * 1. Get default channel for zones (tax/shipping)
     * 2. Create Channel (requires zones from default channel)
     * 3. Create Stock Location
     * 4. Assign Stock Location to Channel
     * 5. Create Cash Payment Method → assign to channel
     * 6. Create M-Pesa Payment Method → assign to channel
     * 7. Create Admin Role (channel-scoped) with ALL permissions
     * 8. Create Administrator (with role, channel-scoped)
     */
    async provisionCustomer(
        ctx: RequestContext,
        registrationData: RegistrationInput
    ): Promise<ProvisionResult> {
        try {
            // Normalize phone number
            const formattedPhone = formatPhoneNumber(registrationData.adminPhoneNumber);

            // Step 1: Get default channel for zones
            const defaultChannel = await this.getDefaultChannel(ctx);
            if (!defaultChannel || !defaultChannel.defaultShippingZone || !defaultChannel.defaultTaxZone) {
                throw new Error('Default zones not configured. Please set up shipping and tax zones in the default channel first.');
            }

            // Step 2: Create Channel
            console.log('[RegistrationService] Creating channel:', registrationData.companyCode);
            const channel = await this.createChannel(ctx, registrationData, defaultChannel);
            console.log('[RegistrationService] Channel created:', channel.id, 'Token:', channel.token);

            // Step 3: Create Stock Location
            console.log('[RegistrationService] Creating stock location:', registrationData.storeName);
            const stockLocation = await this.createStockLocation(ctx, registrationData);
            console.log('[RegistrationService] Stock location created:', stockLocation.id);

            // Step 4: Assign Stock Location to Channel
            console.log('[RegistrationService] Assigning stock location to channel');
            await this.assignStockLocationToChannel(ctx, stockLocation.id, channel.id);
            console.log('[RegistrationService] Stock location assigned to channel');

            // Step 5 & 6: Create Payment Methods
            console.log('[RegistrationService] Creating payment methods for channel:', channel.id);
            const paymentMethods = await this.createPaymentMethods(ctx, channel.id);
            console.log('[RegistrationService] Payment methods created:', paymentMethods.length);

            // Step 7: Create Admin Role (channel-scoped)
            console.log('[RegistrationService] Creating admin role for channel:', channel.id);
            const role = await this.createAdminRole(ctx, registrationData, channel.id);
            if (!role || !role.id) {
                throw new Error('Failed to create admin role - role object is invalid');
            }
            console.log('[RegistrationService] Admin role created:', role.id, 'Code:', role.code);

            // Step 8: Create Administrator (channel-scoped, NOT superadmin)
            console.log('[RegistrationService] Creating administrator with role:', role.id);
            const administrator = await this.createAdministrator(
                ctx,
                registrationData,
                role.id,
                formattedPhone
            );
            if (!administrator || !administrator.id) {
                throw new Error('Failed to create administrator - administrator object is invalid');
            }
            console.log('[RegistrationService] Administrator created:', administrator.id);

            // Verify user was created
            if (!administrator.user) {
                throw new Error('Failed to create administrator user');
            }

            console.log('[RegistrationService] Provisioning complete:', {
                channelId: channel.id.toString(),
                stockLocationId: stockLocation.id.toString(),
                roleId: role.id.toString(),
                adminId: administrator.id.toString(),
                userId: administrator.user.id.toString(),
            });

            return {
                channelId: channel.id.toString(),
                stockLocationId: stockLocation.id.toString(),
                roleId: role.id.toString(),
                adminId: administrator.id.toString(),
                userId: administrator.user.id.toString(),
            };
        } catch (error: any) {
            console.error('[RegistrationService] Provisioning failed:', error);
            console.error('[RegistrationService] Error stack:', error.stack);
            throw error;
        }
    }

    /**
     * Get default channel to use its zones for new channel creation
     */
    private async getDefaultChannel(ctx: RequestContext): Promise<Channel | null> {
        // First try to get the current channel
        if (ctx.channelId) {
            const channel = await this.channelService.findOne(ctx, ctx.channelId);
            if (channel && channel.defaultShippingZone && channel.defaultTaxZone) {
                return channel;
            }
        }

        // Get the first available channel as fallback
        const channels = await this.channelService.findAll(ctx);
        return channels.items[0] || null;
    }

    /**
     * Create Channel (Company)
     */
    private async createChannel(
        ctx: RequestContext,
        registrationData: RegistrationInput,
        defaultChannel: Channel
    ): Promise<Channel> {
        const channelResult = await this.channelService.create(ctx, {
            code: registrationData.companyCode,
            token: registrationData.companyCode,
            defaultCurrencyCode: registrationData.currency as CurrencyCode,
            defaultLanguageCode: LanguageCode.en,
            pricesIncludeTax: false,
            defaultShippingZoneId: defaultChannel.defaultShippingZone!.id,
            defaultTaxZoneId: defaultChannel.defaultTaxZone!.id,
            customFields: {},
        });

        if ('errorCode' in channelResult) {
            throw new Error(channelResult.message || 'Failed to create channel');
        }

        return channelResult as Channel;
    }

    /**
     * Create Stock Location (Store)
     */
    private async createStockLocation(
        ctx: RequestContext,
        registrationData: RegistrationInput
    ): Promise<StockLocation> {
        const stockLocationResult = await this.stockLocationService.create(ctx, {
            name: registrationData.storeName,
            description: registrationData.storeAddress || '',
        });

        if ('errorCode' in stockLocationResult) {
            const error = stockLocationResult as any;
            throw new Error(error.message || 'Failed to create stock location');
        }

        return stockLocationResult as StockLocation;
    }

    /**
     * Assign Stock Location to Channel
     * 
     * In Vendure, stock locations are linked to channels through a junction table.
     * We use the connection repository to establish the many-to-many relationship.
     */
    private async assignStockLocationToChannel(
        ctx: RequestContext,
        stockLocationId: ID,
        channelId: ID
    ): Promise<void> {
        // Get the channel and stock location with relations
        const channelRepo = this.connection.getRepository(ctx, Channel);
        const stockLocationRepo = this.connection.getRepository(ctx, StockLocation);

        const channel = await channelRepo.findOne({ where: { id: channelId }, relations: ['stockLocations'] });
        const stockLocation = await stockLocationRepo.findOne({ where: { id: stockLocationId } });

        if (!channel || !stockLocation) {
            throw new Error('Channel or stock location not found');
        }

        // Assign stock location to channel via many-to-many relationship
        if (!channel.stockLocations?.some(sl => sl.id === stockLocation.id)) {
            if (!channel.stockLocations) {
                channel.stockLocations = [];
            }
            channel.stockLocations.push(stockLocation);
            await channelRepo.save(channel);
        }
    }

    /**
     * Create Payment Methods (Cash and M-Pesa) and assign to channel
     */
    private async createPaymentMethods(
        ctx: RequestContext,
        channelId: ID
    ): Promise<PaymentMethod[]> {
        const paymentMethods: PaymentMethod[] = [];

        try {
            // Create Cash Payment Method
            console.log('[RegistrationService] Creating Cash payment method');
            const cashPaymentResult = await this.paymentMethodService.create(ctx, {
                code: `cash-payment-${channelId}`,
                enabled: true,
                handler: {
                    code: 'cash-payment',
                    arguments: [],
                },
                translations: [
                    {
                        languageCode: LanguageCode.en,
                        name: 'Cash Payment',
                        description: 'Cash Payment - Immediate settlement',
                    },
                ],
                customFields: {
                    isActive: true,
                },
            });

            if ('errorCode' in cashPaymentResult) {
                const error = cashPaymentResult as any;
                throw new Error(`Failed to create Cash payment method: ${error.message || 'Unknown error'}`);
            }

            const cashPayment = cashPaymentResult as PaymentMethod;
            console.log('[RegistrationService] Cash payment method created:', cashPayment.id);

            // Assign Cash Payment to Channel
            const channelRepoForCash = this.connection.getRepository(ctx, Channel);
            const channelForCash = await channelRepoForCash.findOne({
                where: { id: channelId },
                relations: ['paymentMethods']
            });

            if (!channelForCash) {
                throw new Error(`Channel ${channelId} not found for Cash payment assignment`);
            }

            const cashPaymentMethod = await this.connection
                .getRepository(ctx, PaymentMethod)
                .findOne({ where: { id: cashPayment.id }, relations: ['channels'] });

            if (!cashPaymentMethod) {
                throw new Error(`Cash payment method ${cashPayment.id} not found`);
            }

            if (!channelForCash.paymentMethods?.some(pm => pm.id === cashPaymentMethod.id)) {
                if (!channelForCash.paymentMethods) {
                    channelForCash.paymentMethods = [];
                }
                channelForCash.paymentMethods.push(cashPaymentMethod);
                await channelRepoForCash.save(channelForCash);
                console.log('[RegistrationService] Cash payment method assigned to channel');
            }

            paymentMethods.push(cashPayment);

            // Create M-Pesa Payment Method
            console.log('[RegistrationService] Creating M-Pesa payment method');
            const mpesaPaymentResult = await this.paymentMethodService.create(ctx, {
                code: `mpesa-payment-${channelId}`,
                enabled: true,
                handler: {
                    code: 'mpesa-payment',
                    arguments: [],
                },
                translations: [
                    {
                        languageCode: LanguageCode.en,
                        name: 'M-Pesa Payment',
                        description: 'M-Pesa Payment - Mobile money',
                    },
                ],
                customFields: {
                    isActive: true,
                },
            });

            if ('errorCode' in mpesaPaymentResult) {
                const error = mpesaPaymentResult as any;
                throw new Error(`Failed to create M-Pesa payment method: ${error.message || 'Unknown error'}`);
            }

            const mpesaPayment = mpesaPaymentResult as PaymentMethod;
            console.log('[RegistrationService] M-Pesa payment method created:', mpesaPayment.id);

            // Assign M-Pesa Payment to Channel
            const channelRepoForMpesa = this.connection.getRepository(ctx, Channel);
            const channelForMpesa = await channelRepoForMpesa.findOne({
                where: { id: channelId },
                relations: ['paymentMethods']
            });

            if (!channelForMpesa) {
                throw new Error(`Channel ${channelId} not found for M-Pesa payment assignment`);
            }

            const mpesaPaymentMethod = await this.connection
                .getRepository(ctx, PaymentMethod)
                .findOne({ where: { id: mpesaPayment.id }, relations: ['channels'] });

            if (!mpesaPaymentMethod) {
                throw new Error(`M-Pesa payment method ${mpesaPayment.id} not found`);
            }

            if (!channelForMpesa.paymentMethods?.some(pm => pm.id === mpesaPaymentMethod.id)) {
                if (!channelForMpesa.paymentMethods) {
                    channelForMpesa.paymentMethods = [];
                }
                channelForMpesa.paymentMethods.push(mpesaPaymentMethod);
                await channelRepoForMpesa.save(channelForMpesa);
                console.log('[RegistrationService] M-Pesa payment method assigned to channel');
            }

            paymentMethods.push(mpesaPayment);
        } catch (error: any) {
            console.error('[RegistrationService] Payment method creation failed:', error);
            throw new Error(`Payment method creation failed: ${error.message || 'Unknown error'}`);
        }

        return paymentMethods;
    }

    /**
     * Create Admin Role with ALL required permissions (channel-scoped)
     * 
     * Permissions match CUSTOMER_PROVISIONING.md Step 4 requirements:
     * - Asset: CreateAsset, ReadAsset, UpdateAsset, DeleteAsset
     * - Catalog: CreateCatalog, ReadCatalog, UpdateCatalog, DeleteCatalog
     * - Customer: CreateCustomer, ReadCustomer, UpdateCustomer, DeleteCustomer
     * - Order: CreateOrder, ReadOrder, UpdateOrder, DeleteOrder
     * - Product: CreateProduct, ReadProduct, UpdateProduct, DeleteProduct
     * - StockLocation: CreateStockLocation, ReadStockLocation, UpdateStockLocation
     * - Settings: ReadSettings, UpdateSettings
     * 
     * NOTE: We use repository directly to bypass permission checks since we're creating
     * a role for a newly created channel that the public context doesn't have access to yet.
     */
    private async createAdminRole(
        ctx: RequestContext,
        registrationData: RegistrationInput,
        channelId: ID
    ): Promise<Role> {
        try {
            const roleCode = `${registrationData.companyCode}-admin`;
            console.log('[RegistrationService] Creating role with code:', roleCode, 'for channel:', channelId);

            // Get channel entity
            const channel = await this.channelService.findOne(ctx, channelId);
            if (!channel) {
                throw new Error(`Channel ${channelId} not found`);
            }

            // Create role using repository directly to bypass permission checks
            // This is necessary because the public context doesn't have permission
            // to assign roles to the newly created channel via RoleService.create()
            const roleRepo = this.connection.getRepository(ctx, Role);

            const role = roleRepo.create({
                code: roleCode,
                description: `Full admin access for ${registrationData.companyName}`,
                permissions: [
                    // Asset permissions
                    Permission.CreateAsset,
                    Permission.ReadAsset,
                    Permission.UpdateAsset,
                    Permission.DeleteAsset,
                    // Catalog permissions
                    Permission.CreateCatalog,
                    Permission.ReadCatalog,
                    Permission.UpdateCatalog,
                    Permission.DeleteCatalog,
                    // Customer permissions
                    Permission.CreateCustomer,
                    Permission.ReadCustomer,
                    Permission.UpdateCustomer,
                    Permission.DeleteCustomer,
                    // Order permissions
                    Permission.CreateOrder,
                    Permission.ReadOrder,
                    Permission.UpdateOrder,
                    Permission.DeleteOrder,
                    // Product permissions
                    Permission.CreateProduct,
                    Permission.ReadProduct,
                    Permission.UpdateProduct,
                    Permission.DeleteProduct,
                    // StockLocation permissions
                    Permission.CreateStockLocation,
                    Permission.ReadStockLocation,
                    Permission.UpdateStockLocation,
                    // Settings permissions
                    Permission.ReadSettings,
                    Permission.UpdateSettings,
                ],
            });

            // Save role first
            const savedRole = await roleRepo.save(role);

            // Then assign channel via many-to-many relationship
            // Load role with channels relation
            const roleWithChannels = await roleRepo.findOne({
                where: { id: savedRole.id },
                relations: ['channels'],
            });

            if (!roleWithChannels) {
                throw new Error('Failed to load role after creation');
            }

            // Assign channel
            if (!roleWithChannels.channels) {
                roleWithChannels.channels = [];
            }
            roleWithChannels.channels.push(channel);

            await roleRepo.save(roleWithChannels);

            console.log('[RegistrationService] Role created successfully:', roleWithChannels.id, 'Code:', roleWithChannels.code);
            return roleWithChannels;
        } catch (error: any) {
            console.error('[RegistrationService] Role creation failed:', error);
            throw new Error(`Failed to create admin role: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Create Administrator (channel-scoped, NOT superadmin, NOT customer)
     * 
     * The administrator is created with:
     * - Phone number as identifier (emailAddress field)
     * - Channel-scoped role (NOT superadmin)
     * - Secure random password (required by Vendure but not used for passwordless auth)
     * 
     * NOTE: We use repository directly to bypass permission checks since we're creating
     * an administrator with a role that the public context doesn't have permission to grant.
     */
    private async createAdministrator(
        ctx: RequestContext,
        registrationData: RegistrationInput,
        roleId: ID,
        phoneNumber: string
    ): Promise<Administrator> {
        try {
            // Generate secure password (required by Vendure but won't be used due to passwordless auth)
            const password = this.generateSecurePassword();
            const hashedPassword = await this.passwordCipher.hash(password);

            console.log('[RegistrationService] Creating administrator with phone:', phoneNumber, 'role:', roleId);

            // Get role entity using repository to avoid permission restrictions
            const roleRepo = this.connection.getRepository(ctx, Role);
            const role = await roleRepo.findOne({
                where: { id: roleId },
                relations: ['channels'],
            });
            if (!role) {
                throw new Error(`Role ${roleId} not found`);
            }

            // Create User entity first using UserService (handles password hashing internally)
            // Note: UserService.create() might have permission checks, so we use repository
            const userRepo = this.connection.getRepository(ctx, User);
            const adminRepo = this.connection.getRepository(ctx, Administrator);

            // Create user entity
            const newUser = new User();
            newUser.identifier = phoneNumber;
            (newUser as any).passwordHash = hashedPassword;
            (newUser as any).verified = true; // Phone verified via OTP
            (newUser as any).roles = [role];

            const savedUser = await userRepo.save(newUser);

            if (!savedUser || !savedUser.id) {
                throw new Error('Failed to create user');
            }

            // Create Administrator entity
            const newAdmin = new Administrator();
            newAdmin.emailAddress = phoneNumber; // Use phone as identifier
            newAdmin.firstName = registrationData.adminFirstName;
            newAdmin.lastName = registrationData.adminLastName;
            (newAdmin as any).user = savedUser;

            const finalAdmin = await adminRepo.save(newAdmin);

            if (!finalAdmin || !finalAdmin.id || !(finalAdmin as any).user || !(finalAdmin as any).user.id) {
                throw new Error('Administrator creation returned invalid result');
            }

            console.log('[RegistrationService] Administrator created:', finalAdmin.id, 'User ID:', (finalAdmin as any).user.id);

            // Emit events for admin/user creation
            if (this.eventRouter && role.channels && role.channels.length > 0) {
                const channelId = role.channels[0].id.toString();
                const ctx = RequestContext.empty();

                // Emit admin created event
                await this.eventRouter.routeEvent({
                    type: ChannelEventType.ADMIN_CREATED,
                    channelId,
                    category: ActionCategory.SYSTEM_NOTIFICATIONS,
                    context: ctx,
                    data: {
                        adminId: finalAdmin.id.toString(),
                        userId: savedUser.id.toString(),
                        firstName: registrationData.adminFirstName,
                        lastName: registrationData.adminLastName,
                    },
                }).catch(err => {
                    console.warn(`Failed to route admin created event: ${err instanceof Error ? err.message : String(err)}`);
                });

                // Emit user created event
                await this.eventRouter.routeEvent({
                    type: ChannelEventType.USER_CREATED,
                    channelId,
                    category: ActionCategory.SYSTEM_NOTIFICATIONS,
                    context: ctx,
                    data: {
                        userId: savedUser.id.toString(),
                        adminId: finalAdmin.id.toString(),
                    },
                }).catch(err => {
                    console.warn(`Failed to route user created event: ${err instanceof Error ? err.message : String(err)}`);
                });
            }

            return finalAdmin;
        } catch (error: any) {
            console.error('[RegistrationService] Administrator creation failed:', error);
            throw new Error(`Failed to create administrator: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Generate a secure random password (not used for passwordless auth but required by Vendure)
     */
    private generateSecurePassword(): string {
        // Generate a secure random password that will never be used
        // Since we're using passwordless auth, this password is just a placeholder
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 32; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }
}

