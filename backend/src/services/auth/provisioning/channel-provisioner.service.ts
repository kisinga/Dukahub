import { Injectable } from '@nestjs/common';
import {
  Channel,
  ChannelService,
  CurrencyCode,
  LanguageCode,
  RequestContext,
  Role,
  TransactionalConnection,
  Zone,
} from '@vendure/core';
import { RegistrationInput } from '../registration.service';
import { RegistrationAuditorService } from './registration-auditor.service';
import { RegistrationErrorService } from './registration-error.service';

/**
 * Channel Provisioner Service
 *
 * Handles channel (company workspace) creation during registration.
 * LOB: Channel = Company workspace/tenant isolation boundary.
 */
@Injectable()
export class ChannelProvisionerService {
  constructor(
    private readonly channelService: ChannelService,
    private readonly connection: TransactionalConnection,
    private readonly auditor: RegistrationAuditorService,
    private readonly errorService: RegistrationErrorService
  ) {}

  /**
   * Create channel for new company registration
   */
  async createChannel(
    ctx: RequestContext,
    registrationData: RegistrationInput,
    kenyaZone: Zone,
    phoneNumber: string,
    sellerId: string
  ): Promise<Channel> {
    try {
      // Calculate trial period
      const trialDays = parseInt(process.env.SUBSCRIPTION_TRIAL_DAYS || '30', 10);
      const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

      const channelResult = await this.channelService.create(ctx, {
        code: registrationData.companyCode,
        token: registrationData.companyCode,
        defaultCurrencyCode: registrationData.currency as CurrencyCode,
        defaultLanguageCode: LanguageCode.en,
        pricesIncludeTax: true,
        sellerId: sellerId,
        defaultShippingZoneId: kenyaZone.id,
        defaultTaxZoneId: kenyaZone.id,
        customFields: {
          status: 'UNAPPROVED', // New channels start as unapproved
          subscriptionStatus: 'trial',
          trialEndsAt: trialEndsAt.toISOString(),
        },
      });

      if ('errorCode' in channelResult) {
        const error = channelResult as any;
        const errorMsg = error.message || 'Failed to create channel';
        throw this.errorService.createError('CHANNEL_CREATE_FAILED', errorMsg);
      }

      const channel = channelResult as Channel;

      // Add channel to SuperAdmin role so they can manage it
      await this.addChannelToSuperAdminRole(ctx, channel);

      // Audit log
      await this.auditor.logEntityCreated(ctx, 'Channel', channel.id.toString(), channel, {
        companyName: registrationData.companyName,
        companyCode: registrationData.companyCode,
        currency: registrationData.currency,
        phoneNumber,
      });

      return channel;
    } catch (error: any) {
      this.errorService.logError('ChannelProvisioner', error, 'Channel creation');
      throw this.errorService.wrapError(error, 'CHANNEL_CREATE_FAILED');
    }
  }

  /**
   * Add channel to SuperAdmin role so superadmin can access and manage it
   */
  private async addChannelToSuperAdminRole(ctx: RequestContext, channel: Channel): Promise<void> {
    try {
      const roleRepo = this.connection.getRepository(ctx, Role);
      const superAdminRole = await roleRepo.findOne({
        where: { code: '__super_admin_role__' },
        relations: ['channels'],
      });

      if (!superAdminRole) {
        // SuperAdmin role should always exist, but handle gracefully
        return;
      }

      // Check if channel is already in the role
      const hasChannel = superAdminRole.channels?.some((c: Channel) => c.id === channel.id);
      if (!hasChannel) {
        // Initialize channels array if needed
        if (!superAdminRole.channels) {
          superAdminRole.channels = [];
        }
        // Add channel to SuperAdmin role
        superAdminRole.channels.push(channel);
        await roleRepo.save(superAdminRole);
      }
    } catch (error: any) {
      // Log error but don't fail channel creation if SuperAdmin role update fails
      // This is a non-critical operation - channel will still be created
      console.error(
        `Failed to add channel ${channel.id} to SuperAdmin role: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
