import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import {
    Channel,
    Permission,
    RequestContext,
    Role,
    User
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

const buildService = () => {
    const roleService = {
        create: jest.fn(async (ctx: RequestContext, input: any) => {
            // Simulate permission check - will fail with public context (no user)
            // System context should have user set with id 'superadmin-id'
            // RequestContext.activeUserId is a getter that reads from user.id
            const userId = (ctx as any).user?.id || ctx.activeUserId;
            if (!userId || String(userId) !== 'superadmin-id') {
                return { errorCode: 'error.forbidden', message: 'Forbidden' };
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

    const service = new RoleProvisionerService(
        roleService as any,
        channelService as any,
        connection as any,
        auditor as any,
        errorService as any,
        userService as any
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
        it('should create system context with superadmin and use it for RoleService.create()', async () => {
            const harness = buildService();

            const result = await harness.service.createAdminRole(
                publicCtx,
                registrationData,
                2
            );

            // Verify that UserService was called to get superadmin
            // Note: The actual email comes from env.superadmin.username which may vary
            expect(harness.userService.getUserByEmailAddress).toHaveBeenCalled();
            const getUserCall = harness.userService.getUserByEmailAddress.mock.calls[0];
            expect(getUserCall[0]).toBeInstanceOf(Object); // RequestContext
            expect(typeof getUserCall[1]).toBe('string'); // email/username

            // Verify RoleService.create was called with a context that has superadmin user
            // Note: activeUserId is a getter that reads from user.id, so we check for user property
            const createCall = harness.roleService.create.mock.calls[0];
            const contextUsed = createCall[0] as RequestContext;
            
            // Verify context has user set (activeUserId is computed from user.id)
            expect((contextUsed as any).user?.id).toBe('superadmin-id');
            expect(contextUsed.channel?.id).toBe(2);
            
            // Verify the input parameters
            expect(createCall[1]).toMatchObject({
                code: 'test-company-admin',
                channelIds: [2],
                permissions: expect.arrayContaining([Permission.CreateAsset]),
            });

            // Verify role was created successfully (not via repository fallback)
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
            const verificationCall = findOneCalls.find(call => 
                call[0]?.relations?.includes('channels') && call[0]?.where?.id === 6
            );
            
            expect(verificationCall).toBeDefined();
            if (verificationCall) {
                expect(verificationCall[0]).toMatchObject({
                    where: { id: 6 },
                    relations: ['channels'],
                });
            }
        });

        it('should fall back to repository method if system context creation fails', async () => {
            const harness = buildService();
            // Mock UserService to fail to find superadmin (returns null)
            harness.userService.getUserByEmailAddress.mockResolvedValueOnce(null);
            
            // Mock RoleService.create to return error (simulating permission failure)
            harness.roleService.create.mockResolvedValueOnce({
                errorCode: 'error.forbidden',
                message: 'Forbidden'
            });

            const result = await harness.service.createAdminRole(
                publicCtx,
                registrationData,
                2
            );

            // Should still create role via repository fallback
            expect(result).toBeDefined();
            expect(result.id).toBe(6);
            // Verify repository method was used (save was called)
            expect(harness.roleRepository.save).toHaveBeenCalled();
            // Verify RoleService.create was attempted (but failed)
            expect(harness.roleService.create).toHaveBeenCalled();
        });

        it('should audit log role creation', async () => {
            const harness = buildService();

            const result = await harness.service.createAdminRole(
                publicCtx,
                registrationData,
                2
            );

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

