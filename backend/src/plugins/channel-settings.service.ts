import { Injectable } from '@nestjs/common';
import {
    Administrator,
    AdministratorService,
    Asset,
    ChannelService,
    PaymentMethod,
    PaymentMethodService,
    Permission,
    RequestContext,
    Role,
    RoleService,
    TransactionalConnection
} from '@vendure/core';
import { OverridePricePermission } from './price-override.permission';

export interface ChannelSettings {
    cashierFlowEnabled: boolean;
    cashierOpen: boolean;
    companyLogoAsset?: Asset;
}

export interface InviteAdministratorInput {
    emailAddress: string;
    firstName: string;
    lastName: string;
}

@Injectable()
export class ChannelSettingsService {
    constructor(
        private readonly channelService: ChannelService,
        private readonly paymentMethodService: PaymentMethodService,
        private readonly administratorService: AdministratorService,
        private readonly roleService: RoleService,
        private readonly connection: TransactionalConnection
    ) { }

    async getChannelSettings(ctx: RequestContext): Promise<ChannelSettings> {
        const channel = await this.channelService.findOne(ctx, ctx.channelId!);
        if (!channel) {
            throw new Error('Channel not found');
        }

        const customFields = channel.customFields as any;

        return {
            cashierFlowEnabled: customFields?.cashierFlowEnabled || false,
            cashierOpen: customFields?.cashierOpen || false,
            companyLogoAsset: undefined, // WORKAROUND: Logo loaded via CompanyService in frontend due to custom field relation loading issues
        };
    }

    async updateChannelSettings(ctx: RequestContext, input: any): Promise<ChannelSettings> {
        const updateInput = {
            id: ctx.channelId!,
            customFields: {
                cashierFlowEnabled: input.cashierFlowEnabled,
                cashierOpen: input.cashierOpen,
                companyLogoAsset: input.companyLogoAssetId,
            },
        };

        await this.channelService.update(ctx, updateInput);
        return this.getChannelSettings(ctx);
    }

    async getChannelAdministrators(ctx: RequestContext): Promise<Administrator[]> {
        // Get administrators assigned to the current channel
        const administrators = await this.connection
            .getRepository(ctx, Administrator)
            .createQueryBuilder('administrator')
            .leftJoinAndSelect('administrator.user', 'user')
            .leftJoinAndSelect('administrator.roles', 'role')
            .leftJoinAndSelect('role.channels', 'channel')
            .where('channel.id = :channelId', { channelId: ctx.channelId })
            .getMany();

        return administrators;
    }

    async inviteChannelAdministrator(
        ctx: RequestContext,
        input: InviteAdministratorInput
    ): Promise<Administrator> {
        // Get or create "Channel Admin" role for this channel
        let channelAdminRole = await this.connection
            .getRepository(ctx, Role)
            .createQueryBuilder('role')
            .leftJoinAndSelect('role.channels', 'channel')
            .where('role.code = :code', { code: `channel-admin-${ctx.channelId}` })
            .andWhere('channel.id = :channelId', { channelId: ctx.channelId })
            .getOne();

        if (!channelAdminRole) {
            // Create channel admin role
            const createRoleInput = {
                code: `channel-admin-${ctx.channelId}`,
                description: `Channel Admin for ${ctx.channelId}`,
                permissions: [
                    Permission.ReadCatalog,
                    Permission.UpdateCatalog,
                    Permission.ReadOrder,
                    Permission.UpdateOrder,
                    Permission.ReadCustomer,
                    Permission.UpdateCustomer,
                    Permission.ReadSettings,
                    Permission.UpdateSettings,
                    OverridePricePermission.Permission,
                ],
                channelIds: [ctx.channelId!],
            };

            channelAdminRole = await this.roleService.create(ctx, createRoleInput);
        }

        // Create administrator directly using AdministratorService
        const createAdminInput = {
            emailAddress: input.emailAddress,
            firstName: input.firstName,
            lastName: input.lastName,
            password: this.generateTemporaryPassword(),
            roleIds: [channelAdminRole.id],
        };

        const administrator = await this.administratorService.create(ctx, createAdminInput);

        // TODO: Send invitation email
        // await this.emailService.sendAdminInvitation(administrator, ctx.channel);

        return administrator;
    }

    async getChannelPaymentMethods(ctx: RequestContext): Promise<PaymentMethod[]> {
        // Get payment methods available for the current channel
        const paymentMethods = await this.paymentMethodService.findAll(ctx, {
            filter: {
                enabled: { eq: true },
            },
        });

        return paymentMethods.items;
    }

    async createChannelPaymentMethod(
        ctx: RequestContext,
        input: any
    ): Promise<PaymentMethod> {
        const createInput = {
            ...input,
            enabled: true,
            customFields: {
                imageAssetId: input.imageAssetId,
                isActive: true,
            },
        };

        return this.paymentMethodService.create(ctx, createInput);
    }

    async updateChannelPaymentMethod(
        ctx: RequestContext,
        input: any
    ): Promise<PaymentMethod> {
        const updateInput = {
            id: input.id,
            name: input.name,
            description: input.description,
            customFields: {
                imageAssetId: input.imageAssetId,
                isActive: input.isActive,
            },
        };

        return this.paymentMethodService.update(ctx, updateInput);
    }

    private generateTemporaryPassword(): string {
        // Generate a secure temporary password
        return Math.random().toString(36).slice(-12) + '!A1';
    }
}
