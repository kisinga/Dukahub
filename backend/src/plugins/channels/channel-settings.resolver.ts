import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';
import { gql } from 'graphql-tag';

import { ChannelSettingsService, UpdateChannelSettingsInput } from '../../services/channels/channel-settings.service';

export const channelSettingsSchema = gql`
    extend type Mutation {
        updateChannelSettings(input: UpdateChannelSettingsInput!): ChannelSettings!
        inviteChannelAdministrator(input: InviteAdministratorInput!): Administrator!
        createChannelPaymentMethod(input: CreatePaymentMethodInput!): PaymentMethod!
        updateChannelPaymentMethod(input: UpdatePaymentMethodInput!): PaymentMethod!
    }

    type ChannelSettings {
        cashierFlowEnabled: Boolean!
        cashierOpen: Boolean!
        companyLogoAsset: Asset
    }

    input UpdateChannelSettingsInput {
        cashierFlowEnabled: Boolean
        cashierOpen: Boolean
        companyLogoAssetId: ID
    }

    input InviteAdministratorInput {
        emailAddress: String!
        firstName: String!
        lastName: String!
    }
`;

@Resolver()
export class ChannelSettingsResolver {
    constructor(private readonly channelSettingsService: ChannelSettingsService) { }

    @Mutation()
    @Allow(Permission.UpdateSettings)
    async updateChannelSettings(
        @Ctx() ctx: RequestContext,
        @Args('input') input: UpdateChannelSettingsInput
    ) {
        return this.channelSettingsService.updateChannelSettings(ctx, input);
    }

    @Mutation()
    @Allow(Permission.CreateAdministrator)
    async inviteChannelAdministrator(
        @Ctx() ctx: RequestContext,
        @Args('input') input: any
    ) {
        return this.channelSettingsService.inviteChannelAdministrator(ctx, input);
    }

    @Mutation()
    @Allow(Permission.CreatePaymentMethod)
    async createChannelPaymentMethod(
        @Ctx() ctx: RequestContext,
        @Args('input') input: any
    ) {
        return this.channelSettingsService.createChannelPaymentMethod(ctx, input);
    }

    @Mutation()
    @Allow(Permission.UpdatePaymentMethod)
    async updateChannelPaymentMethod(
        @Ctx() ctx: RequestContext,
        @Args('input') input: any
    ) {
        return this.channelSettingsService.updateChannelPaymentMethod(ctx, input);
    }
}