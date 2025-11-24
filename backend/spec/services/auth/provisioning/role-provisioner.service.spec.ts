import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import {
  Channel,
  Permission,
  RequestContext,
  Role,
  RoleService,
  Seller,
  User,
} from '@vendure/core';
import { RoleProvisionerService } from '../../../../src/services/auth/provisioning/role-provisioner.service';
import { RegistrationInput } from '../../../../src/services/auth/registration.service';

// Mock environment config
jest.mock('../../../../src/infrastructure/config/environment.config', () => ({
  env: {
    superadmin: {
      username: 'test-superadmin',
      password: 'test-password',
    },
    auditDb: {
      host: 'localhost',
      port: 5432,
      name: 'test_audit',
      username: 'test',
      password: 'test',
    },
    db: {
      host: 'localhost',
      port: 5432,
      name: 'test',
      username: 'test',
      password: 'test',
    },
  },
}));

// Mock seller-access utility
jest.mock('../../../../src/utils/seller-access.util', () => ({
  withSellerFromChannel: jest.fn(
    async (
      ctx: RequestContext,
      channelId: any,
      connection: any,
      fn: (ctx: RequestContext) => Promise<any>
    ) => {
      // Mock seller for channel
      const mockSeller = { id: 'seller-1', name: 'Test Seller' } as Seller;
      // Set seller on context
      (ctx as any).seller = mockSeller;
      try {
        return await fn(ctx);
      } finally {
        delete (ctx as any).seller;
      }
    }
  ),
}));

const buildService = () => {
  const roleService = {
    create: jest.fn(async (ctx: RequestContext, input: any) => {
      // Simulate permission check - will pass if seller is set on context
      const seller = (ctx as any).seller;
      if (!seller) {
        return { errorCode: 'error.forbidden', message: 'Forbidden - no seller' };
      }
      return {
        id: 6,
        code: input.code,
        description: input.description,
        permissions: input.permissions,
        channels: [{ id: 2 }],
      } as Role;
    }),
  };

  const channelService = {
    findOne: jest.fn(async (ctx: RequestContext, id: any) => {
      return { id: 2, token: 'channel-token' } as Channel;
    }),
  };

  // Track created roles for repository fallback - shared across all repository instances
  const createdRoles = new Map<any, any>();

  // Create a single repository instance that will be reused
  const roleRepository = {
    create: jest.fn((data: any) => {
      const role = { ...data, id: 6 };
      createdRoles.set(6, role);
      return role;
    }),
    save: jest.fn(async (entity: any) => {
      const saved = { ...entity, id: entity.id || 6 };
      // If channels are being added, preserve them
      if (entity.channels) {
        saved.channels = entity.channels;
      }
      createdRoles.set(saved.id, saved);
      return saved;
    }),
    findOne: jest.fn(async (options: any) => {
      const roleId = options.where?.id || options.where?.id;
      if (roleId === 6 || createdRoles.has(6)) {
        const role = createdRoles.get(6) || { id: 6, code: 'test-company-admin', permissions: [] };
        const result = { ...role };
        if (options.relations?.includes('channels')) {
          result.channels = role.channels || [{ id: 2 }];
        }
        return result;
      }
      return null;
    }),
  };

  const connection = {
    getRepository: jest.fn((ctx: RequestContext, entity: any) => {
      if (entity === Role) {
        return roleRepository;
      }
      if (entity === Channel) {
        return {
          findOne: jest.fn(async (options: any) => {
            if (options.where?.id === 2) {
              return {
                id: 2,
                token: 'channel-token',
                seller: { id: 'seller-1', name: 'Test Seller' },
              } as Channel;
            }
            return null;
          }),
        };
      }
      return {
        create: jest.fn((data: any) => data),
        save: jest.fn(async (entity: any) => entity),
        findOne: jest.fn(async () => null),
      };
    }),
  };

  const superadminUser = {
    id: 'superadmin-id',
    identifier: 'superadmin',
    roles: [],
    deletedAt: null,
    authenticationMethods: [],
    verified: true,
    lastLogin: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    customFields: {},
    sessions: [],
    getNativeAuthenticationMethod: jest.fn(),
  } as unknown as User;

  const userService = {
    getUserByEmailAddress: jest.fn(async (ctx: RequestContext, email: string) => {
      // Support both 'superadmin' and 'test-superadmin' for flexibility
      if (email === 'superadmin' || email === 'test-superadmin') {
        return superadminUser;
      }
      return null;
    }),
  };

  const auditor = {
    logEntityCreated: jest.fn(async () => undefined),
  };

  const errorService = {
    logError: jest.fn(),
    wrapError: jest.fn((error: any) => error),
    createError: jest.fn((code: string, message: string) => new Error(`${code}: ${message}`)),
  };

  const contextAdapter = {
    withSellerScope: jest.fn(
      async (ctx: RequestContext, channelId: any, fn: any, options?: any) => {
        // Use the existing withSellerFromChannel mock behavior
        // This ensures compatibility with existing test expectations
        const mockSeller = { id: 'seller-1', name: 'Test Seller' } as Seller;
        (ctx as any).seller = mockSeller;
        try {
          return await fn(ctx);
        } finally {
          delete (ctx as any).seller;
        }
      }
    ),
  };

  const service = new RoleProvisionerService(
    connection as any,
    roleService as any,
    auditor as any,
    errorService as any,
    contextAdapter as any
  );

  return {
    service,
    roleService,
    channelService,
    connection,
    roleRepository, // Expose roleRepository for test assertions
    userService,
    auditor,
    errorService,
    contextAdapter,
    superadminUser,
  };
};

describe('RoleProvisionerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const publicCtx = {
    activeUserId: undefined,
    channelId: 2,
    languageCode: 'en',
    channel: { id: 2, token: 'channel-token' },
  } as unknown as RequestContext;

  const registrationData: RegistrationInput = {
    companyName: 'Test Company',
    companyCode: 'test-company',
    currency: 'USD',
    adminFirstName: 'Jane',
    adminLastName: 'Doe',
    adminPhoneNumber: '0712345678',
    storeName: 'Main Store',
  };

  describe('createAdminRole', () => {
    it('should use RoleService.create() with seller set on RequestContext', async () => {
      const harness = buildService();

      const result = await harness.service.createAdminRole(publicCtx, registrationData, 2);

      // Verify RoleService.create was called
      expect(harness.roleService.create).toHaveBeenCalled();
      const createCall = harness.roleService.create.mock.calls[0];
      const contextUsed = createCall[0] as RequestContext;

      // Verify context has seller set (from withSellerFromChannel)
      expect((contextUsed as any).seller).toBeDefined();
      expect((contextUsed as any).seller.id).toBe('seller-1');

      // Verify the input parameters
      expect(createCall[1]).toMatchObject({
        code: 'test-company-admin',
        channelIds: [2],
        permissions: expect.arrayContaining([Permission.CreateAsset]),
      });

      // Verify role was created successfully
      expect(result.id).toBe(6);
      expect(result.code).toBe('test-company-admin');
    });

    it('should create role with all admin permissions', async () => {
      const harness = buildService();

      await harness.service.createAdminRole(publicCtx, registrationData, 2);

      // Verify RoleService.create was called
      expect(harness.roleService.create).toHaveBeenCalled();
      const createCall = harness.roleService.create.mock.calls[0];

      // Verify the call has the expected structure
      expect(createCall).toBeDefined();
      expect(createCall.length).toBeGreaterThanOrEqual(2);

      const permissions = createCall[1]?.permissions;
      expect(permissions).toBeDefined();
      expect(Array.isArray(permissions)).toBe(true);

      // Verify all required permissions are included
      expect(permissions).toContain(Permission.CreateAsset);
      expect(permissions).toContain(Permission.ReadAsset);
      expect(permissions).toContain(Permission.UpdateAsset);
      expect(permissions).toContain(Permission.DeleteAsset);
      expect(permissions).toContain(Permission.CreateOrder);
      expect(permissions).toContain(Permission.ReadOrder);
      expect(permissions).toContain(Permission.CreateStockLocation);
      expect(permissions).toContain(Permission.ReadStockLocation);
      expect(permissions).toContain(Permission.UpdateStockLocation);
    });

    it('should assign role to channel via channelIds parameter', async () => {
      const harness = buildService();

      await harness.service.createAdminRole(publicCtx, registrationData, 2);

      const createCall = harness.roleService.create.mock.calls[0];
      const input = createCall[1];

      expect(input.channelIds).toEqual([2]);
    });

    it('should verify role-channel linkage after creation', async () => {
      const harness = buildService();

      await harness.service.createAdminRole(publicCtx, registrationData, 2);

      // Verify that verification was called (should call findOne with relations)
      // The verification happens in verifyRoleChannelLinkage
      const findOneCalls = harness.roleRepository.findOne.mock.calls;
      const verificationCall = findOneCalls.find(
        call => call[0]?.relations?.includes('channels') && call[0]?.where?.id === 6
      );

      expect(verificationCall).toBeDefined();
      if (verificationCall) {
        expect(verificationCall[0]).toMatchObject({
          where: { id: 6 },
          relations: ['channels'],
        });
      }
    });

    it('should throw error if RoleService.create() fails', async () => {
      const harness = buildService();

      // Mock RoleService.create to return error (simulating permission failure)
      harness.roleService.create.mockResolvedValueOnce({
        errorCode: 'error.forbidden',
        message: 'Forbidden',
      });

      // Should throw error (no repository fallback in new implementation)
      await expect(
        harness.service.createAdminRole(publicCtx, registrationData, 2)
      ).rejects.toThrow();

      // Verify RoleService.create was attempted
      expect(harness.roleService.create).toHaveBeenCalled();
    });

    it('should audit log role creation', async () => {
      const harness = buildService();

      const result = await harness.service.createAdminRole(publicCtx, registrationData, 2);

      expect(harness.auditor.logEntityCreated).toHaveBeenCalledWith(
        publicCtx,
        'Role',
        '6',
        result,
        expect.objectContaining({
          channelId: '2',
          companyCode: 'test-company',
          companyName: 'Test Company',
        })
      );
    });
  });

  describe('getAdminPermissions', () => {
    it('should return all required admin permissions', () => {
      const harness = buildService();
      const permissions = harness.service.getAdminPermissions();

      expect(permissions).toContain(Permission.CreateAsset);
      expect(permissions).toContain(Permission.ReadAsset);
      expect(permissions).toContain(Permission.UpdateAsset);
      expect(permissions).toContain(Permission.DeleteAsset);
      expect(permissions).toContain(Permission.CreateOrder);
      expect(permissions).toContain(Permission.ReadOrder);
      expect(permissions.length).toBeGreaterThan(20);
    });
  });
});
