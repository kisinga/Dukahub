import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';
import { gql } from 'graphql-tag';

import { ChannelSettingsService } from './channel-settings.service';

export const channelSettingsSchema = gql`
    extend type Query {
        getChannelSettings: ChannelSettings!
        getChannelAdministrators: [Administrator!]!
        getChannelPaymentMethods: [PaymentMethod!]!
    }

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

    @Query()
    @Allow(Permission.ReadSettings)
    async getChannelSettings(@Ctx() ctx: RequestContext) {
        return this.channelSettingsService.getChannelSettings(ctx);
    }

    @Mutation()
    @Allow(Permission.UpdateSettings)
    async updateChannelSettings(
        @Ctx() ctx: RequestContext,
        @Args('input') input: any
    ) {
        return this.channelSettingsService.updateChannelSettings(ctx, input);
    }

    @Query()
    @Allow(Permission.ReadAdministrator)
    async getChannelAdministrators(@Ctx() ctx: RequestContext) {
        return this.channelSettingsService.getChannelAdministrators(ctx);
    }

    @Mutation()
    @Allow(Permission.CreateAdministrator)
    async inviteChannelAdministrator(
        @Ctx() ctx: RequestContext,
        @Args('input') input: any
    ) {
        return this.channelSettingsService.inviteChannelAdministrator(ctx, input);
    }

    @Query()
    @Allow(Permission.ReadSettings)
    async getChannelPaymentMethods(@Ctx() ctx: RequestContext) {
        return this.channelSettingsService.getChannelPaymentMethods(ctx);
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