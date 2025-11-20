import { Injectable } from '@nestjs/common';
import {
  Channel,
  ID,
  PaymentMethod,
  RequestContext,
  StockLocation,
  TransactionalConnection,
} from '@vendure/core';

/**
 * Channel Assignment Service
 *
 * Handles many-to-many relationship assignments to channels:
 * - Stock locations → channels
 * - Payment methods → channels
 *
 * Follows pattern: Load → Check → Assign → Save → Verify
 */
@Injectable()
export class ChannelAssignmentService {
  constructor(private readonly connection: TransactionalConnection) {}

  /**
   * Assign stock location to channel
   * Verifies assignment after saving
   * 
   * Uses repository.save() to persist the many-to-many relationship.
   * The relationship is managed through TypeORM's many-to-many decorator.
   */
  async assignStockLocationToChannel(
    ctx: RequestContext,
    stockLocationId: ID,
    channelId: ID
  ): Promise<void> {
    const channelRepo = this.connection.getRepository(ctx, Channel);
    const stockLocationRepo = this.connection.getRepository(ctx, StockLocation);

    // Load entities with relations
    const channel = await channelRepo.findOne({
      where: { id: channelId },
      relations: ['stockLocations'],
    });
    const stockLocation = await stockLocationRepo.findOne({
      where: { id: stockLocationId },
    });

    if (!channel || !stockLocation) {
      throw new Error(
        `REGISTRATION_STOCK_LOCATION_ASSIGN_FAILED: ` +
          `Channel ${channelId} or stock location ${stockLocationId} not found`
      );
    }

    // Assign if not already assigned
    if (!channel.stockLocations?.some(sl => sl.id === stockLocation.id)) {
      if (!channel.stockLocations) {
        channel.stockLocations = [];
      }
      channel.stockLocations.push(stockLocation);
      await channelRepo.save(channel);
    }

    // Verify assignment
    await this.verifyStockLocationAssignment(ctx, stockLocationId, channelId);
  }

  /**
   * Assign payment method to channel
   * Verifies assignment after saving
   */
  async assignPaymentMethodToChannel(
    ctx: RequestContext,
    paymentMethodId: ID,
    channelId: ID
  ): Promise<void> {
    const channelRepo = this.connection.getRepository(ctx, Channel);
    const paymentMethodRepo = this.connection.getRepository(ctx, PaymentMethod);

    // Load entities with relations
    const channel = await channelRepo.findOne({
      where: { id: channelId },
      relations: ['paymentMethods'],
    });
    const paymentMethod = await paymentMethodRepo.findOne({
      where: { id: paymentMethodId },
      relations: ['channels'],
    });

    if (!channel || !paymentMethod) {
      throw new Error(
        `REGISTRATION_PAYMENT_METHOD_ASSIGN_FAILED: ` +
          `Channel ${channelId} or payment method ${paymentMethodId} not found`
      );
    }

    // Assign if not already assigned
    if (!channel.paymentMethods?.some(pm => pm.id === paymentMethod.id)) {
      if (!channel.paymentMethods) {
        channel.paymentMethods = [];
      }
      channel.paymentMethods.push(paymentMethod);
      await channelRepo.save(channel);
    }

    // Verify assignment
    await this.verifyPaymentMethodAssignment(ctx, paymentMethodId, channelId);
  }

  /**
   * Verify stock location is assigned to channel
   */
  private async verifyStockLocationAssignment(
    ctx: RequestContext,
    stockLocationId: ID,
    channelId: ID
  ): Promise<void> {
    const channelRepo = this.connection.getRepository(ctx, Channel);
    const verifiedChannel = await channelRepo.findOne({
      where: { id: channelId },
      relations: ['stockLocations'],
    });

    if (
      !verifiedChannel ||
      !verifiedChannel.stockLocations?.some(sl => sl.id === stockLocationId)
    ) {
      throw new Error(
        `REGISTRATION_STOCK_LOCATION_ASSIGN_FAILED: ` +
          `Failed to verify stock location assignment to channel`
      );
    }
  }

  /**
   * Verify payment method is assigned to channel
   */
  private async verifyPaymentMethodAssignment(
    ctx: RequestContext,
    paymentMethodId: ID,
    channelId: ID
  ): Promise<void> {
    const channelRepo = this.connection.getRepository(ctx, Channel);
    const verifiedChannel = await channelRepo.findOne({
      where: { id: channelId },
      relations: ['paymentMethods'],
    });

    if (
      !verifiedChannel ||
      !verifiedChannel.paymentMethods?.some(pm => pm.id === paymentMethodId)
    ) {
      throw new Error(
        `REGISTRATION_PAYMENT_METHOD_ASSIGN_FAILED: ` +
          `Failed to verify payment method assignment to channel`
      );
    }
  }

  /**
   * Verify channel has minimum number of payment methods
   */
  async verifyPaymentMethodCount(
    ctx: RequestContext,
    channelId: ID,
    minimumCount: number = 2
  ): Promise<void> {
    const channelRepo = this.connection.getRepository(ctx, Channel);
    const channel = await channelRepo.findOne({
      where: { id: channelId },
      relations: ['paymentMethods'],
    });

    if (!channel || !channel.paymentMethods || channel.paymentMethods.length < minimumCount) {
      throw new Error(
        `REGISTRATION_PAYMENT_METHOD_ASSIGN_FAILED: ` +
          `Channel should have at least ${minimumCount} payment methods assigned, ` +
          `but found ${channel?.paymentMethods?.length || 0}`
      );
    }
  }
}
