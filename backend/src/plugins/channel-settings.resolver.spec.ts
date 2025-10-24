import { Test, TestingModule } from '@nestjs/testing';
import { RequestContext } from '@vendure/core';
import { ChannelSettingsResolver } from './channel-settings.resolver';
import { ChannelSettingsService } from './channel-settings.service';

describe('ChannelSettingsResolver', () => {
    let resolver: ChannelSettingsResolver;
    let service: ChannelSettingsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChannelSettingsResolver,
                {
                    provide: ChannelSettingsService,
                    useValue: {
                        getChannelSettings: jest.fn(),
                        updateChannelSettings: jest.fn(),
                        getChannelAdministrators: jest.fn(),
                        inviteChannelAdministrator: jest.fn(),
                        getChannelPaymentMethods: jest.fn(),
                        createChannelPaymentMethod: jest.fn(),
                        updateChannelPaymentMethod: jest.fn(),
                    },
                },
            ],
        }).compile();

        resolver = module.get<ChannelSettingsResolver>(ChannelSettingsResolver);
        service = module.get<ChannelSettingsService>(ChannelSettingsService);
    });

    it('should be defined', () => {
        expect(resolver).toBeDefined();
    });

    describe('getChannelSettings', () => {
        it('should call service method', async () => {
            const mockCtx = { channelId: 'test-channel-id' } as RequestContext;
            const mockSettings = { cashierFlowEnabled: true, cashierOpen: false, companyLogoAsset: undefined };

            jest.spyOn(service, 'getChannelSettings').mockResolvedValue(mockSettings);

            const result = await resolver.getChannelSettings(mockCtx);

            expect(service.getChannelSettings).toHaveBeenCalledWith(mockCtx);
            expect(result).toEqual(mockSettings);
        });
    });

    describe('updateChannelSettings', () => {
        it('should call service method', async () => {
            const mockCtx = { channelId: 'test-channel-id' } as RequestContext;
            const mockInput = { cashierFlowEnabled: true };
            const mockSettings = { cashierFlowEnabled: true, cashierOpen: false, companyLogoAsset: undefined };

            jest.spyOn(service, 'updateChannelSettings').mockResolvedValue(mockSettings);

            const result = await resolver.updateChannelSettings(mockCtx, mockInput);

            expect(service.updateChannelSettings).toHaveBeenCalledWith(mockCtx, mockInput);
            expect(result).toEqual(mockSettings);
        });
    });

    describe('getChannelAdministrators', () => {
        it('should call service method', async () => {
            const mockCtx = { channelId: 'test-channel-id' } as RequestContext;
            const mockAdmins: any[] = [];

            jest.spyOn(service, 'getChannelAdministrators').mockResolvedValue(mockAdmins);

            const result = await resolver.getChannelAdministrators(mockCtx);

            expect(service.getChannelAdministrators).toHaveBeenCalledWith(mockCtx);
            expect(result).toEqual(mockAdmins);
        });
    });

    describe('inviteChannelAdministrator', () => {
        it('should call service method', async () => {
            const mockCtx = { channelId: 'test-channel-id' } as RequestContext;
            const mockInput = { emailAddress: 'test@example.com', firstName: 'John', lastName: 'Doe' };
            const mockAdmin: any = { id: 'admin-1', emailAddress: 'test@example.com' };

            jest.spyOn(service, 'inviteChannelAdministrator').mockResolvedValue(mockAdmin);

            const result = await resolver.inviteChannelAdministrator(mockCtx, mockInput);

            expect(service.inviteChannelAdministrator).toHaveBeenCalledWith(mockCtx, mockInput);
            expect(result).toEqual(mockAdmin);
        });
    });

    describe('getChannelPaymentMethods', () => {
        it('should call service method', async () => {
            const mockCtx = { channelId: 'test-channel-id' } as RequestContext;
            const mockPaymentMethods: any[] = [];

            jest.spyOn(service, 'getChannelPaymentMethods').mockResolvedValue(mockPaymentMethods);

            const result = await resolver.getChannelPaymentMethods(mockCtx);

            expect(service.getChannelPaymentMethods).toHaveBeenCalledWith(mockCtx);
            expect(result).toEqual(mockPaymentMethods);
        });
    });

    describe('createChannelPaymentMethod', () => {
        it('should call service method', async () => {
            const mockCtx = { channelId: 'test-channel-id' } as RequestContext;
            const mockInput = { name: 'Test Payment', code: 'test' };
            const mockPaymentMethod: any = { id: 'pm-1', name: 'Test Payment' };

            jest.spyOn(service, 'createChannelPaymentMethod').mockResolvedValue(mockPaymentMethod);

            const result = await resolver.createChannelPaymentMethod(mockCtx, mockInput);

            expect(service.createChannelPaymentMethod).toHaveBeenCalledWith(mockCtx, mockInput);
            expect(result).toEqual(mockPaymentMethod);
        });
    });

    describe('updateChannelPaymentMethod', () => {
        it('should call service method', async () => {
            const mockCtx = { channelId: 'test-channel-id' } as RequestContext;
            const mockInput = { id: 'pm-1', name: 'Updated Payment' };
            const mockPaymentMethod: any = { id: 'pm-1', name: 'Updated Payment' };

            jest.spyOn(service, 'updateChannelPaymentMethod').mockResolvedValue(mockPaymentMethod);

            const result = await resolver.updateChannelPaymentMethod(mockCtx, mockInput);

            expect(service.updateChannelPaymentMethod).toHaveBeenCalledWith(mockCtx, mockInput);
            expect(result).toEqual(mockPaymentMethod);
        });
    });
});