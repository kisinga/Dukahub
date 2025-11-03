import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';
import { Request, Response } from 'express';
import gql from 'graphql-tag';
import { PhoneAuthService, RegistrationInput } from './phone-auth.service';

export const phoneAuthSchema = gql`
    type OTPResponse {
        success: Boolean!
        message: String!
        expiresAt: Int
    }

    type RegistrationResult {
        success: Boolean!
        userId: ID
        message: String!
    }

    type LoginResult {
        success: Boolean!
        token: String
        user: UserInfo
        message: String!
        authorizationStatus: String  # Status: PENDING, APPROVED, REJECTED - included for UI communication, not blocking
    }

    type UserInfo {
        id: ID!
        identifier: String!
    }

    type AuthorizationStatus {
        status: String!
        message: String!
    }

    input RegistrationInput {
        companyName: String!
        companyCode: String!
        currency: String!
        adminFirstName: String!
        adminLastName: String!
        adminPhoneNumber: String!
        adminEmail: String
        storeName: String!
        storeAddress: String
    }

    extend type Mutation {
        requestRegistrationOTP(phoneNumber: String!): OTPResponse!
        verifyRegistrationOTP(
            phoneNumber: String!
            otp: String!
            registrationData: RegistrationInput!
        ): RegistrationResult!
        requestLoginOTP(phoneNumber: String!): OTPResponse!
        verifyLoginOTP(phoneNumber: String!, otp: String!): LoginResult!
    }

    extend type Query {
        checkAuthorizationStatus(identifier: String!): AuthorizationStatus!
    }
`;

@Resolver()
export class PhoneAuthResolver {
    constructor(private phoneAuthService: PhoneAuthService) {}

    // Helper to get Request/Response from context
    private getRequestFromContext(ctx: RequestContext): { req: Request; res: Response } | null {
        // RequestContext should have req/res, but accessing them requires checking
        // In Vendure, these are typically available through the GraphQL context
        // For now, we'll need to pass them through the resolver method
        return null;
    }

    @Mutation()
    @Allow(Permission.Public)
    async requestRegistrationOTP(
        @Ctx() ctx: RequestContext,
        @Args('phoneNumber') phoneNumber: string,
    ) {
        return this.phoneAuthService.requestRegistrationOTP(phoneNumber);
    }

    @Mutation()
    @Allow(Permission.Public)
    async verifyRegistrationOTP(
        @Ctx() ctx: RequestContext,
        @Args('phoneNumber') phoneNumber: string,
        @Args('otp') otp: string,
        @Args('registrationData') registrationData: RegistrationInput,
    ) {
        return this.phoneAuthService.verifyRegistrationOTP(
            ctx,
            phoneNumber,
            otp,
            registrationData
        );
    }

    @Mutation()
    @Allow(Permission.Public)
    async requestLoginOTP(
        @Ctx() ctx: RequestContext,
        @Args('phoneNumber') phoneNumber: string,
    ) {
        return this.phoneAuthService.requestLoginOTP(phoneNumber);
    }

    @Mutation()
    @Allow(Permission.Public)
    async verifyLoginOTP(
        @Ctx() ctx: RequestContext,
        @Args('phoneNumber') phoneNumber: string,
        @Args('otp') otp: string,
    ) {
        return this.phoneAuthService.verifyLoginOTP(ctx, phoneNumber, otp.trim());
    }

    @Query()
    @Allow(Permission.Public)
    async checkAuthorizationStatus(
        @Ctx() ctx: RequestContext,
        @Args('identifier') identifier: string,
    ) {
        return this.phoneAuthService.checkAuthorizationStatus(identifier);
    }
}

