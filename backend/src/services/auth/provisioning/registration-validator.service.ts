import { Injectable } from '@nestjs/common';
import {
  Administrator,
  Channel,
  ChannelService,
  CurrencyCode,
  RequestContext,
  TransactionalConnection,
  User,
  Zone,
  ZoneService,
} from '@vendure/core';
import { RegistrationInput } from '../registration.service';

/**
 * Registration Validator Service
 *
 * Handles pre-creation validation for registration data:
 * - Currency code validation
 * - Channel code uniqueness
 * - Default zones availability
 */
@Injectable()
export class RegistrationValidatorService {
  constructor(
    private readonly channelService: ChannelService,
    private readonly connection: TransactionalConnection,
    private readonly zoneService: ZoneService
  ) {}

  /**
   * Validate registration input before provisioning
   * Throws errors with REGISTRATION_ prefix if validation fails
   */
  async validateInput(
    ctx: RequestContext,
    registrationData: RegistrationInput,
    existingUser?: User
  ): Promise<void> {
    // Validate currency code
    if (!Object.values(CurrencyCode).includes(registrationData.currency as CurrencyCode)) {
      throw new Error(
        `REGISTRATION_CURRENCY_INVALID: Invalid currency code "${registrationData.currency}". Must be a valid CurrencyCode enum value.`
      );
    }

    // Validate channel code/token uniqueness
    await this.validateChannelCodeUniqueness(ctx, registrationData.companyCode);

    // Validate default zones are configured
    await this.validateDefaultZones(ctx);

    // Validate admin email uniqueness if provided
    if (registrationData.adminEmail) {
      await this.validateAdminEmailUniqueness(ctx, registrationData.adminEmail, existingUser);
    }
  }

  /**
   * Get default channel with zones for new channel creation
   */
  async getDefaultChannel(ctx: RequestContext): Promise<Channel> {
    // First try to get the current channel
    if (ctx.channelId) {
      const channel = await this.channelService.findOne(ctx, ctx.channelId);
      if (channel && channel.defaultShippingZone && channel.defaultTaxZone) {
        return channel;
      }
    }

    // Get the first available channel as fallback
    const channels = await this.channelService.findAll(ctx);
    const defaultChannel = channels.items[0];

    if (!defaultChannel) {
      throw new Error(
        `REGISTRATION_ZONES_MISSING: No channels found in system. Please create a default channel first.`
      );
    }

    return defaultChannel;
  }

  private async validateChannelCodeUniqueness(
    ctx: RequestContext,
    companyCode: string
  ): Promise<void> {
    const channelRepo = this.connection.getRepository(ctx, Channel);
    const existingChannel = await channelRepo.findOne({
      where: { code: companyCode },
    });

    if (existingChannel) {
      throw new Error(
        `REGISTRATION_CHANNEL_CODE_EXISTS: Channel with code "${companyCode}" already exists. Please choose a different company code.`
      );
    }
  }

  private async validateDefaultZones(ctx: RequestContext): Promise<void> {
    const defaultChannel = await this.getDefaultChannel(ctx);

    if (!defaultChannel.defaultShippingZone || !defaultChannel.defaultTaxZone) {
      throw new Error(
        `REGISTRATION_ZONES_MISSING: Default zones not configured. ` +
          `Please set up shipping and tax zones in the default channel first. ` +
          `Navigate to Settings → Channels → Default Channel and configure defaultShippingZone and defaultTaxZone.`
      );
    }
  }

  async validateAdminEmailUniqueness(
    ctx: RequestContext,
    email: string,
    existingUser?: User,
    phoneNumber?: string
  ): Promise<void> {
    const adminRepo = this.connection.getRepository(ctx, Administrator);
    const existingAdmin = await adminRepo.findOne({
      where: { emailAddress: email },
      relations: ['user'],
    });

    if (existingAdmin) {
      // If admin exists, check if it belongs to the same user
      // Case 1: We have the existing user entity (from provisionCustomer)
      if (existingUser && existingAdmin.user && existingAdmin.user.id === existingUser.id) {
        return; // Same user, allow using same email
      }

      // Case 2: We have the phone number (from requestRegistrationOTP)
      // Check if the existing admin is linked to a user with this phone number
      if (phoneNumber && existingAdmin.user && existingAdmin.user.identifier === phoneNumber) {
        return; // Same user (by phone), allow using same email
      }

      throw new Error(
        `REGISTRATION_EMAIL_EXISTS: An administrator with email "${email}" already exists. Please use a different email address.`
      );
    }
  }

  /**
   * Get Africa zone by name
   * Used for setting default shipping and tax zones for new channels
   */
  async getAfricaZone(ctx: RequestContext): Promise<Zone> {
    const zoneRepo = this.connection.getRepository(ctx, Zone);
    const africaZone = await zoneRepo.findOne({
      where: { name: 'Africa' },
    });

    if (!africaZone) {
      throw new Error(
        `REGISTRATION_AFRICA_ZONE_MISSING: Africa zone not found. ` +
          `Please create a zone named "Africa" in Settings → Zones.`
      );
    }

    return africaZone;
  }
}
