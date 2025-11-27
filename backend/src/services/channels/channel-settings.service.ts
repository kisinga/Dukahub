import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
  User,
} from '@vendure/core';
import { AuditService } from '../../infrastructure/audit/audit.service';
import {
  ApproveCustomerCreditPermission,
  ManageCustomerCreditLimitPermission,
} from '../../plugins/credit/permissions';
import { OverridePricePermission } from '../../plugins/pricing/price-override.permission';
import { ChannelActionTrackingService } from '../../infrastructure/events/channel-action-tracking.service';
import { ChannelEventType } from '../../infrastructure/events/types/event-type.enum';
import { ActionCategory } from '../../infrastructure/events/types/action-category.enum';
import { ChannelActionType } from '../../infrastructure/events/types/action-type.enum';
import {
  ROLE_TEMPLATES,
  RoleTemplate,
} from '../auth/provisioning/role-provisioner.service';

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
  emailAddress?: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  roleTemplateCode?: string;
  permissionOverrides?: Permission[];
}

export interface CreateChannelAdminInput {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emailAddress?: string;
  roleTemplateCode: string;
  permissionOverrides?: Permission[];
}

export interface UpdateChannelAdminInput {
  id: string;
  permissions: Permission[];
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
    private readonly auditService: AuditService,
    private readonly actionTrackingService: ChannelActionTrackingService
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

  /**
   * Get available role templates
   */
  getRoleTemplates(): RoleTemplate[] {
    return Object.values(ROLE_TEMPLATES);
  }

  /**
   * Check admin count rate limit
   */
  private async checkAdminCountLimit(ctx: RequestContext): Promise<void> {
    const channelId = ctx.channelId!;
    const channel = await this.channelService.findOne(ctx, channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    const customFields = (channel.customFields ?? {}) as {
      maxAdminCount?: number;
    };

    const maxAdminCount = customFields.maxAdminCount ?? 5;

    // Count current administrators for this channel
    const administrators = await this.connection
      .getRepository(ctx, Administrator)
      .createQueryBuilder('admin')
      .leftJoinAndSelect('admin.user', 'user')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.channels', 'channel')
      .where('channel.id = :channelId', { channelId })
      .getMany();

    if (administrators.length >= maxAdminCount) {
      throw new BadRequestException(
        `Maximum admin count (${maxAdminCount}) reached for this channel.`
      );
    }
  }

  /**
   * Invite or create channel administrator
   * Supports both legacy email-based and new phone-based flows
   */
  async inviteChannelAdministrator(
    ctx: RequestContext,
    input: InviteAdministratorInput | CreateChannelAdminInput
  ): Promise<Administrator> {
    const channelId = ctx.channelId!;

    // Check rate limit
    await this.checkAdminCountLimit(ctx);

    // Determine role template
    const roleTemplateCode = 'roleTemplateCode' in input ? input.roleTemplateCode : 'admin';
    const template = roleTemplateCode ? ROLE_TEMPLATES[roleTemplateCode] : undefined;
    if (!template) {
      throw new BadRequestException(`Invalid role template code: ${roleTemplateCode}`);
    }

    // Merge template permissions with overrides
    const finalPermissions =
      'permissionOverrides' in input && input.permissionOverrides
        ? input.permissionOverrides
        : template.permissions;

    // Create or get role for this admin
    const roleCode = `channel-${roleTemplateCode}-${channelId}-${Date.now()}`;
    const createRoleInput = {
      code: roleCode,
      description: `${template.name} role for ${input.firstName} ${input.lastName}`,
      permissions: finalPermissions,
      channelIds: [channelId],
    };

    const role = await this.roleService.create(ctx, createRoleInput);

    // Create administrator
    const createAdminInput: any = {
      firstName: input.firstName,
      lastName: input.lastName,
      password: this.generateTemporaryPassword(),
      roleIds: [role.id],
    };

    // Handle phone number (new flow) or email (legacy flow)
    if ('phoneNumber' in input && input.phoneNumber) {
      // Phone-based flow: create user with phone identifier
      createAdminInput.identifier = input.phoneNumber;
      if (input.emailAddress) {
        createAdminInput.emailAddress = input.emailAddress;
      }
    } else if ('emailAddress' in input && input.emailAddress) {
      // Legacy email-based flow
      createAdminInput.emailAddress = input.emailAddress;
    } else {
      throw new BadRequestException('Either phoneNumber or emailAddress must be provided');
    }

    const administrator = await this.administratorService.create(ctx, createAdminInput);

    // Track action (using SMS as placeholder action type for counting)
    await this.actionTrackingService.trackAction(
      ctx,
      channelId.toString(),
      ChannelEventType.ADMIN_CREATED,
      ChannelActionType.SMS,
      ActionCategory.SYSTEM_NOTIFICATIONS,
      {
        adminId: administrator.id.toString(),
        roleTemplateCode: roleTemplateCode || 'admin',
      }
    );

    // Log audit event
    await this.auditService
      .log(ctx, 'admin.invited', {
        entityType: 'Administrator',
        entityId: administrator.id.toString(),
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          phoneNumber: 'phoneNumber' in input ? input.phoneNumber : undefined,
          emailAddress: 'emailAddress' in input ? input.emailAddress : undefined,
          roleId: role.id.toString(),
          roleTemplateCode,
        },
      })
      .catch(err => {
        this.logger.warn(
          `Failed to log admin invitation audit: ${err instanceof Error ? err.message : String(err)}`
        );
      });

    // TODO: Send welcome SMS notification for new admin invitations

    return administrator;
  }

  /**
   * Update channel administrator permissions
   */
  async updateChannelAdministrator(
    ctx: RequestContext,
    input: UpdateChannelAdminInput
  ): Promise<Administrator> {
    const channelId = ctx.channelId!;

    // Get administrator
    const administrator = await this.administratorService.findOne(ctx, input.id);
    if (!administrator) {
      throw new NotFoundException(`Administrator with ID ${input.id} not found`);
    }

    // Verify administrator belongs to this channel
    const user = await this.connection.getRepository(ctx, User).findOne({
      where: { id: administrator.user.id },
      relations: ['roles', 'roles.channels'],
    });

    if (!user || !user.roles.some(role => role.channels.some(ch => ch.id === channelId))) {
      throw new BadRequestException('Administrator does not belong to this channel');
    }

    // Update role permissions (assuming single role per admin for simplicity)
    const role = user.roles.find(r => r.channels.some(ch => ch.id === channelId));
    if (!role) {
      throw new BadRequestException('Role not found for administrator');
    }

    await this.roleService.update(ctx, {
      id: role.id,
      permissions: input.permissions,
    });

    // Track action (using SMS as placeholder action type for counting)
    await this.actionTrackingService.trackAction(
      ctx,
      channelId.toString(),
      ChannelEventType.ADMIN_UPDATED,
      ChannelActionType.SMS,
      ActionCategory.SYSTEM_NOTIFICATIONS,
      {
        adminId: administrator.id.toString(),
      }
    );

    // Log audit event
    await this.auditService
      .log(ctx, 'admin.updated', {
        entityType: 'Administrator',
        entityId: administrator.id.toString(),
        data: {
          permissions: input.permissions,
        },
      })
      .catch(err => {
        this.logger.warn(
          `Failed to log admin update audit: ${err instanceof Error ? err.message : String(err)}`
        );
      });

    // Reload administrator
    const updated = await this.administratorService.findOne(ctx, input.id);
    if (!updated) {
      throw new Error('Failed to reload administrator after update');
    }

    return updated;
  }

  /**
   * Disable (soft delete) channel administrator
   */
  async disableChannelAdministrator(
    ctx: RequestContext,
    adminId: string
  ): Promise<{ success: boolean; message: string }> {
    const channelId = ctx.channelId!;

    // Get administrator
    const administrator = await this.administratorService.findOne(ctx, adminId);
    if (!administrator) {
      throw new NotFoundException(`Administrator with ID ${adminId} not found`);
    }

    // Delete administrator via repository (Vendure doesn't expose delete on AdministratorService)
    // Remove all roles first, then delete the administrator entity
    const user = await this.connection.getRepository(ctx, User).findOne({
      where: { id: administrator.user.id },
      relations: ['roles'],
    });

    if (user && user.roles.length > 0) {
      // Remove all roles
      user.roles = [];
      await this.connection.getRepository(ctx, User).save(user);
    }

    // Delete the administrator entity
    await this.connection.getRepository(ctx, Administrator).remove(administrator);

    // Log audit event
    await this.auditService
      .log(ctx, 'admin.disabled', {
        entityType: 'Administrator',
        entityId: adminId,
        data: {
          firstName: administrator.firstName,
          lastName: administrator.lastName,
        },
      })
      .catch(err => {
        this.logger.warn(
          `Failed to log admin disable audit: ${err instanceof Error ? err.message : String(err)}`
        );
      });

    return {
      success: true,
      message: 'Administrator disabled successfully',
    };
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
