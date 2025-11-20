import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelService,
  ID,
  Permission,
  RequestContext,
  Role,
  RoleService,
  TransactionalConnection,
} from '@vendure/core';
import { RegistrationInput } from '../registration.service';
import { RegistrationAuditorService } from './registration-auditor.service';
import { RegistrationErrorService } from './registration-error.service';

/**
 * Role Provisioner Service
 *
 * Handles admin role creation with full permissions and channel assignment.
 * LOB: Role = Access control and permissions for channel admins.
 */
@Injectable()
export class RoleProvisionerService {
  private readonly logger = new Logger(RoleProvisionerService.name);

  /**
   * All required admin permissions as per CUSTOMER_PROVISIONING.md Step 5
   * Factored into constant for maintainability
   */
  private static readonly ALL_ADMIN_PERMISSIONS: Permission[] = [
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
    // Order permissions (covers payments and fulfillments)
    Permission.CreateOrder,
    Permission.ReadOrder,
    Permission.UpdateOrder,
    Permission.DeleteOrder,
    // Product permissions (covers products and variants)
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
  ];

  constructor(
    private readonly roleService: RoleService,
    private readonly channelService: ChannelService,
    private readonly connection: TransactionalConnection,
    private readonly auditor: RegistrationAuditorService,
    private readonly errorService: RegistrationErrorService
  ) {}

  /**
   * Create admin role with all required permissions and assign to channel
   */
  async createAdminRole(
    ctx: RequestContext,
    registrationData: RegistrationInput,
    channelId: ID
  ): Promise<Role> {
    try {
      const roleCode = `${registrationData.companyCode}-admin`;
      const channel = await this.channelService.findOne(ctx, channelId);

      if (!channel) {
        throw this.errorService.createError('ROLE_CREATE_FAILED', `Channel ${channelId} not found`);
      }

      // Try RoleService.create() first, fall back to repository if needed
      let role = await this.createRoleViaService(
        ctx,
        roleCode,
        registrationData,
        channelId,
        channel
      );

      if (!role) {
        role = await this.createRoleViaRepository(
          ctx,
          roleCode,
          registrationData,
          channelId,
          channel
        );
      }

      // Verify role-channel linkage
      await this.verifyRoleChannelLinkage(ctx, role.id, channelId);

      // Audit log
      await this.auditor.logEntityCreated(ctx, 'Role', role.id.toString(), role, {
        channelId: channelId.toString(),
        companyCode: registrationData.companyCode,
        companyName: registrationData.companyName,
      });

      return role;
    } catch (error: any) {
      this.errorService.logError('RoleProvisioner', error, 'Role creation');
      throw this.errorService.wrapError(error, 'ROLE_CREATE_FAILED');
    }
  }

  /**
   * Get all admin permissions
   */
  getAdminPermissions(): Permission[] {
    return [...RoleProvisionerService.ALL_ADMIN_PERMISSIONS];
  }

  /**
   * Try to create role via RoleService (preferred)
   */
  private async createRoleViaService(
    ctx: RequestContext,
    roleCode: string,
    registrationData: RegistrationInput,
    channelId: ID,
    channel: any
  ): Promise<Role | null> {
    try {
      // Use existing context which should have proper channel setup
      // The channelIds parameter in create() is sufficient for channel assignment
      const roleResult = await this.roleService.create(ctx, {
        code: roleCode,
        description: `Full admin access for ${registrationData.companyName}`,
        channelIds: [channelId],
        permissions: RoleProvisionerService.ALL_ADMIN_PERMISSIONS,
      });

      // Check if result is an error (Vendure returns error objects with errorCode)
      if (roleResult && typeof roleResult === 'object' && 'errorCode' in roleResult) {
        const errorMessage = (roleResult as any).message || 'RoleService.create() failed';
        throw new Error(errorMessage);
      }

      this.logger.log(`Role created via RoleService: ${roleResult.id} Code: ${roleResult.code}`);
      return roleResult as Role;
    } catch (error: any) {
      this.logger.warn(`RoleService.create() failed, falling back to repository: ${error.message}`);
      return null;
    }
  }

  /**
   * Create role via repository (fallback)
   */
  private async createRoleViaRepository(
    ctx: RequestContext,
    roleCode: string,
    registrationData: RegistrationInput,
    channelId: ID,
    channel: any
  ): Promise<Role> {
    const roleRepo = this.connection.getRepository(ctx, Role);

    const newRole = roleRepo.create({
      code: roleCode,
      description: `Full admin access for ${registrationData.companyName}`,
      permissions: RoleProvisionerService.ALL_ADMIN_PERMISSIONS,
    });

    const savedRole = await roleRepo.save(newRole);

    // Assign channel via many-to-many relationship
    const roleWithChannels = await roleRepo.findOne({
      where: { id: savedRole.id },
      relations: ['channels'],
    });

    if (!roleWithChannels) {
      throw this.errorService.createError(
        'ROLE_CREATE_FAILED',
        'Failed to load role after creation'
      );
    }

    if (!roleWithChannels.channels) {
      roleWithChannels.channels = [];
    }
    roleWithChannels.channels.push(channel);

    const role = await roleRepo.save(roleWithChannels);
    this.logger.log(`Role created via repository: ${role.id} Code: ${role.code}`);
    return role;
  }

  /**
   * Verify role is properly linked to channel
   */
  private async verifyRoleChannelLinkage(
    ctx: RequestContext,
    roleId: ID,
    channelId: ID
  ): Promise<void> {
    const roleRepo = this.connection.getRepository(ctx, Role);
    const verifiedRole = await roleRepo.findOne({
      where: { id: roleId },
      relations: ['channels'],
    });

    if (!verifiedRole) {
      throw this.errorService.createError(
        'ROLE_ASSIGN_FAILED',
        'Failed to load role for verification'
      );
    }

    if (!verifiedRole.channels || !verifiedRole.channels.some(ch => ch.id === channelId)) {
      throw this.errorService.createError(
        'ROLE_ASSIGN_FAILED',
        `Role ${roleId} is not properly linked to channel ${channelId}`
      );
    }
  }
}
