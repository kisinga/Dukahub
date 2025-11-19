import { Injectable } from '@nestjs/common';
import { Channel, ChannelService, CurrencyCode, LanguageCode, RequestContext } from '@vendure/core';
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
    private readonly auditor: RegistrationAuditorService,
    private readonly errorService: RegistrationErrorService
  ) {}

  /**
   * Create channel for new company registration
   */
  async createChannel(
    ctx: RequestContext,
    registrationData: RegistrationInput,
    defaultChannel: Channel,
    phoneNumber: string
  ): Promise<Channel> {
    try {
      const channelResult = await this.channelService.create(ctx, {
        code: registrationData.companyCode,
        token: registrationData.companyCode,
        defaultCurrencyCode: registrationData.currency as CurrencyCode,
        defaultLanguageCode: LanguageCode.en,
        pricesIncludeTax: false,
        defaultShippingZoneId: defaultChannel.defaultShippingZone!.id,
        defaultTaxZoneId: defaultChannel.defaultTaxZone!.id,
        customFields: {
          status: 'UNAPPROVED', // New channels start as unapproved
        },
      });

      if ('errorCode' in channelResult) {
        throw this.errorService.createError(
          'CHANNEL_CREATE_FAILED',
          channelResult.message || 'Failed to create channel'
        );
      }

      const channel = channelResult as Channel;

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
}
