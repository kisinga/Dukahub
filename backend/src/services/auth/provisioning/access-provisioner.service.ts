import { Injectable, Optional } from '@nestjs/common';
import {
    Administrator,
    ID,
    PasswordCipher,
    RequestContext,
    Role,
    TransactionalConnection,
    User,
} from '@vendure/core';
import { ChannelEventRouterService } from '../../../infrastructure/events/channel-event-router.service';
import { ActionCategory } from '../../../infrastructure/events/types/action-category.enum';
import { ChannelEventType } from '../../../infrastructure/events/types/event-type.enum';
import { RegistrationInput } from '../registration.service';
import { RegistrationAuditorService } from './registration-auditor.service';
import { RegistrationErrorService } from './registration-error.service';

/**
 * Access Provisioner Service
 * 
 * Handles user and administrator creation with role assignment.
 * LOB: Access = User authentication and authorization (who can access the channel).
 */
@Injectable()
export class AccessProvisionerService {
    constructor(
        private readonly connection: TransactionalConnection,
        private readonly passwordCipher: PasswordCipher,
        private readonly auditor: RegistrationAuditorService,
        private readonly errorService: RegistrationErrorService,
        @Optional() private readonly eventRouter?: ChannelEventRouterService,
    ) { }

    /**
     * Create administrator with user and role assignment
     */
    async createAdministrator(
        ctx: RequestContext,
        registrationData: RegistrationInput,
        role: Role,
        phoneNumber: string
    ): Promise<Administrator> {
        try {
            // Create user first
            const user = await this.createUser(ctx, phoneNumber, role);

            // Verify user-role linkage and get verified user
            const verifiedUser = await this.verifyUserRoleLinkage(ctx, user.id, role.id);

            // Create administrator linked to verified user
            const administrator = await this.createAdministratorEntity(ctx, registrationData, phoneNumber, verifiedUser);

            // Audit and emit events
            await this.auditAndEmitEvents(ctx, verifiedUser, administrator, role, registrationData);

            return administrator;
        } catch (error: any) {
            this.errorService.logError('AccessProvisioner', error, 'Administrator creation');
            throw this.errorService.wrapError(error, 'ADMIN_CREATE_FAILED');
        }
    }

    private async createUser(ctx: RequestContext, phoneNumber: string, role: Role): Promise<User> {
        const password = this.generateSecurePassword();
        const hashedPassword = await this.passwordCipher.hash(password);

        const userRepo = this.connection.getRepository(ctx, User);

        const newUser = new User();
        newUser.identifier = phoneNumber;
        (newUser as any).passwordHash = hashedPassword;
        (newUser as any).verified = true; // Phone verified via OTP
        (newUser as any).roles = [role];

        const savedUser = await userRepo.save(newUser);

        if (!savedUser || !savedUser.id) {
            throw this.errorService.createError('USER_CREATE_FAILED', 'Failed to create user');
        }

        return savedUser;
    }

    private async verifyUserRoleLinkage(ctx: RequestContext, userId: ID, roleId: ID): Promise<User> {
        const userRepo = this.connection.getRepository(ctx, User);
        const verifiedUser = await userRepo.findOne({
            where: { id: userId },
            relations: ['roles'],
        });

        if (!verifiedUser) {
            throw this.errorService.createError('USER_ASSIGN_FAILED', 'Failed to load user for verification');
        }

        if (!verifiedUser.roles || !verifiedUser.roles.some(r => r.id === roleId)) {
            throw this.errorService.createError(
                'USER_ASSIGN_FAILED',
                `User ${userId} is not properly linked to role ${roleId}`
            );
        }

        return verifiedUser;
    }

    private async createAdministratorEntity(
        ctx: RequestContext,
        registrationData: RegistrationInput,
        phoneNumber: string,
        user: User
    ): Promise<Administrator> {
        const adminRepo = this.connection.getRepository(ctx, Administrator);

        const newAdmin = new Administrator();
        newAdmin.emailAddress = phoneNumber; // Use phone as identifier
        newAdmin.firstName = registrationData.adminFirstName;
        newAdmin.lastName = registrationData.adminLastName;
        (newAdmin as any).user = user; // Use verified user passed from caller

        const finalAdmin = await adminRepo.save(newAdmin);

        if (!finalAdmin || !finalAdmin.id || !(finalAdmin as any).user || !(finalAdmin as any).user.id) {
            throw this.errorService.createError('ADMIN_CREATE_FAILED', 'Administrator creation returned invalid result');
        }

        return finalAdmin;
    }

    private async auditAndEmitEvents(
        ctx: RequestContext,
        user: User,
        administrator: Administrator,
        role: Role,
        registrationData: RegistrationInput
    ): Promise<void> {
        const channelId = role.channels && role.channels.length > 0 
            ? role.channels[0].id.toString() 
            : null;

        if (!channelId) {
            return; // Cannot audit/emit without channel
        }

        // Audit logs
        await this.auditor.logEntityCreated(ctx, 'User', user.id.toString(), user, {
            identifier: user.identifier,
            adminId: administrator.id.toString(),
        });

        await this.auditor.logEntityCreated(ctx, 'Administrator', administrator.id.toString(), administrator, {
            userId: user.id.toString(),
            firstName: registrationData.adminFirstName,
            lastName: registrationData.adminLastName,
            emailAddress: administrator.emailAddress,
        });

        // Emit events
        if (this.eventRouter) {
            const emptyCtx = RequestContext.empty();

            await this.eventRouter.routeEvent({
                type: ChannelEventType.ADMIN_CREATED,
                channelId,
                category: ActionCategory.SYSTEM_NOTIFICATIONS,
                context: emptyCtx,
                data: {
                    adminId: administrator.id.toString(),
                    userId: user.id.toString(),
                    firstName: registrationData.adminFirstName,
                    lastName: registrationData.adminLastName,
                },
            }).catch(err => {
                console.warn(`Failed to route admin created event: ${err instanceof Error ? err.message : String(err)}`);
            });

            await this.eventRouter.routeEvent({
                type: ChannelEventType.USER_CREATED,
                channelId,
                category: ActionCategory.SYSTEM_NOTIFICATIONS,
                context: emptyCtx,
                data: {
                    userId: user.id.toString(),
                    adminId: administrator.id.toString(),
                },
            }).catch(err => {
                console.warn(`Failed to route user created event: ${err instanceof Error ? err.message : String(err)}`);
            });
        }
    }

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

