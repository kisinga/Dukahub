import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  Administrator,
  AdministratorService,
  Asset,
  Channel,
  ChannelService,
  PaymentMethod,
  PaymentMethodService,
  Permission,
  RequestContext,
  Role,
  RoleService,
  TransactionalConnection,
} from '@vendure/core';
import { AuditService } from '../../infrastructure/audit/audit.service';
import {
  ApproveCustomerCreditPermission,
  ManageCustomerCreditLimitPermission,
} from '../../plugins/credit/permissions';
import { OverridePricePermission } from '../../plugins/pricing/price-override.permission';

export interface ChannelSettings {
  cashierFlowEnabled: boolean;
  cashierOpen: boolean;
  companyLogoAsset?: Asset | null;
}

export interface UpdateChannelSettingsInput {
  cashierFlowEnabled?: boolean | null;
  cashierOpen?: boolean | null;
  companyLogoAssetId?: string | null;
}

export interface InviteAdministratorInput {
  emailAddress: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class ChannelSettingsService {
  private readonly logger = new Logger(ChannelSettingsService.name);

  constructor(
    private readonly channelService: ChannelService,
    private readonly paymentMethodService: PaymentMethodService,
    private readonly administratorService: AdministratorService,
    private readonly roleService: RoleService,
    private readonly connection: TransactionalConnection,
    private readonly auditService: AuditService
  ) {}

  async updateChannelSettings(
    ctx: RequestContext,
    input: UpdateChannelSettingsInput
  ): Promise<ChannelSettings> {
    const channelId = ctx.channelId!;
    const channel = await this.channelService.findOne(ctx, channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    const current = (channel.customFields ?? {}) as {
      cashierFlowEnabled?: boolean;
      cashierOpen?: boolean;
      companyLogoAsset?: Asset | null;
    };

    const nextCashierFlowEnabled = input.cashierFlowEnabled ?? current.cashierFlowEnabled ?? false;
    const nextCashierOpen = input.cashierOpen ?? current.cashierOpen ?? false;

    if (!nextCashierFlowEnabled && nextCashierOpen) {
      throw new BadRequestException(
        'Cashier cannot be open when the cashier approval flow is disabled.'
      );
    }

    const customFieldsUpdate: Record<string, any> = {};

    if (
      input.cashierFlowEnabled !== undefined &&
      input.cashierFlowEnabled !== current.cashierFlowEnabled
    ) {
      customFieldsUpdate.cashierFlowEnabled = input.cashierFlowEnabled;
    }

    if (input.cashierOpen !== undefined && input.cashierOpen !== current.cashierOpen) {
      customFieldsUpdate.cashierOpen = input.cashierOpen;
    }

    if (
      input.cashierFlowEnabled !== undefined &&
      input.cashierFlowEnabled === false &&
      input.cashierOpen === undefined &&
      current.cashierOpen !== false
    ) {
      customFieldsUpdate.cashierOpen = false;
    }

    if (input.companyLogoAssetId !== undefined) {
      if (!input.companyLogoAssetId) {
        customFieldsUpdate.companyLogoAsset = null;
      } else {
        const asset = await this.connection.getRepository(ctx, Asset).findOne({
          where: { id: input.companyLogoAssetId },
        });

        if (!asset) {
          throw new BadRequestException('Company logo asset not found.');
        }

        if (current.companyLogoAsset?.id !== input.companyLogoAssetId) {
          customFieldsUpdate.companyLogoAsset = input.companyLogoAssetId;
        }
      }
    }

    if (Object.keys(customFieldsUpdate).length > 0) {
      await this.channelService.update(ctx, {
        id: channelId,
        customFields: customFieldsUpdate,
      });

      this.logger.log('Channel settings updated', {
        channelId,
        fields: Object.keys(customFieldsUpdate),
      });

      // Log audit event
      await this.auditService
        .log(ctx, 'channel.settings.updated', {
          entityType: 'Channel',
          entityId: channelId.toString(),
          data: {
            fields: Object.keys(customFieldsUpdate),
            changes: customFieldsUpdate,
          },
        })
        .catch(err => {
          this.logger.warn(
            `Failed to log channel settings update audit: ${err instanceof Error ? err.message : String(err)}`
          );
        });

      const updatedChannel = await this.channelService.findOne(ctx, channelId);
      if (!updatedChannel) {
        throw new Error('Channel not found after update');
      }

      return this.mapChannelSettings(updatedChannel);
    }

    return this.mapChannelSettings(channel);
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
          ApproveCustomerCreditPermission.Permission,
          ManageCustomerCreditLimitPermission.Permission,
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

    // Log audit event
    await this.auditService
      .log(ctx, 'admin.invited', {
        entityType: 'Administrator',
        entityId: administrator.id.toString(),
        data: {
          emailAddress: input.emailAddress,
          firstName: input.firstName,
          lastName: input.lastName,
          roleId: channelAdminRole.id.toString(),
        },
      })
      .catch(err => {
        this.logger.warn(
          `Failed to log admin invitation audit: ${err instanceof Error ? err.message : String(err)}`
        );
      });

    // TODO: Send invitation email
    // await this.emailService.sendAdminInvitation(administrator, ctx.channel);

    return administrator;
  }

  async createChannelPaymentMethod(ctx: RequestContext, input: any): Promise<PaymentMethod> {
    const createInput = {
      ...input,
      enabled: true,
      customFields: {
        imageAssetId: input.imageAssetId,
        isActive: true,
      },
    };

    const paymentMethod = await this.paymentMethodService.create(ctx, createInput);

    // Log audit event
    await this.auditService
      .log(ctx, 'channel.payment_method.created', {
        entityType: 'PaymentMethod',
        entityId: paymentMethod.id.toString(),
        data: {
          name: paymentMethod.name,
          code: paymentMethod.code,
        },
      })
      .catch(err => {
        this.logger.warn(
          `Failed to log payment method creation audit: ${err instanceof Error ? err.message : String(err)}`
        );
      });

    return paymentMethod;
  }

  async updateChannelPaymentMethod(ctx: RequestContext, input: any): Promise<PaymentMethod> {
    const updateInput: Record<string, any> = {
      id: input.id,
    };

    if (input.name !== undefined) {
      updateInput.name = input.name;
    }

    if (input.description !== undefined) {
      updateInput.description = input.description;
    }

    const customFields: Record<string, any> = {};

    if (input.imageAssetId !== undefined) {
      customFields.imageAssetId = input.imageAssetId;
    }

    if (input.isActive !== undefined) {
      customFields.isActive = input.isActive;
    }

    if (Object.keys(customFields).length > 0) {
      updateInput.customFields = customFields;
    }

    const paymentMethod = await this.paymentMethodService.update(ctx, updateInput as any);

    // Log audit event
    await this.auditService
      .log(ctx, 'channel.payment_method.updated', {
        entityType: 'PaymentMethod',
        entityId: input.id.toString(),
        data: {
          changes: {
            name: input.name,
            description: input.description,
            customFields,
          },
        },
      })
      .catch(err => {
        this.logger.warn(
          `Failed to log payment method update audit: ${err instanceof Error ? err.message : String(err)}`
        );
      });

    return paymentMethod;
  }

  private generateTemporaryPassword(): string {
    // Generate a secure temporary password
    return Math.random().toString(36).slice(-12) + '!A1';
  }

  private mapChannelSettings(channel: Channel): ChannelSettings {
    const customFields = (channel.customFields ?? {}) as {
      cashierFlowEnabled?: boolean;
      cashierOpen?: boolean;
      companyLogoAsset?: Asset | null;
    };

    return {
      cashierFlowEnabled: customFields.cashierFlowEnabled ?? false,
      cashierOpen: customFields.cashierOpen ?? false,
      companyLogoAsset: customFields.companyLogoAsset ?? null,
    };
  }
}
