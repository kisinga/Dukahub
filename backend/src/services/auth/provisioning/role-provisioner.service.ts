import { Injectable, Logger } from '@nestjs/common';
import {
  Channel,
  ChannelService,
  ID,
  Permission,
  RequestContext,
  Role,
  RoleService,
  TransactionalConnection,
  UserService
} from '@vendure/core';
import { env } from '../../../infrastructure/config/environment.config';
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
    private readonly errorService: RegistrationErrorService,
    private readonly userService: UserService
  ) { }

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
   * Uses system context with superadmin user to bypass permission checks
   */
  private async createRoleViaService(
    ctx: RequestContext,
    roleCode: string,
    registrationData: RegistrationInput,
    channelId: ID,
    channel: Channel
  ): Promise<Role | null> {
    try {
      // Create system context with superadmin user for role creation
      const systemCtx = await this.createSystemContext(ctx, channel);

      // Use system context which has admin permissions
      // The channelIds parameter in create() is sufficient for channel assignment
      const roleResult = await this.roleService.create(systemCtx, {
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
   * Create system RequestContext with superadmin user
   * This context has admin permissions needed for RoleService.create()
   */
  private async createSystemContext(
    ctx: RequestContext,
    channel: Channel
  ): Promise<RequestContext> {
    try {
      // Get superadmin user by identifier from config
      const superadminIdentifier = env.superadmin.username;
      if (!superadminIdentifier) {
        throw new Error('Superadmin username not configured');
      }

      // Create empty context first for getting superadmin user
      const emptyCtxForUser = RequestContext.empty();

      // Get superadmin user
      const superadminUser = await this.userService.getUserByEmailAddress(
        emptyCtxForUser,
        superadminIdentifier
      );

      if (!superadminUser) {
        throw new Error(`Superadmin user not found: ${superadminIdentifier}`);
      }

      // Create system context with superadmin user and channel
      // RequestContext constructor requires specific properties
      // Note: RequestContext.activeUserId is a getter that reads from user.id
      const systemCtx = new RequestContext({
        req: ctx.req,
        apiType: 'admin',
        languageCode: ctx.languageCode || 'en',
        channel: channel,
        isAuthorized: true,
        authorizedAsOwnerOnly: false,
      });

      // Set user property - RequestContext.activeUserId getter will read from user.id
      Object.defineProperty(systemCtx, 'user', {
        value: superadminUser,
        writable: true,
        enumerable: true,
        configurable: true,
      });

      this.logger.debug(
        `Created system context with superadmin user: ${superadminUser.id} for channel: ${channel.id}`
      );

      return systemCtx;
    } catch (error: any) {
      this.logger.warn(`Failed to create system context: ${error.message}`);
      // Fall back to original context if system context creation fails
      return ctx;
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

/**
 * Helper to convert channel ID to string for RequestContext
 */
function channelIdToString(id: ID): string {
  return typeof id === 'string' ? id : id.toString();
}
