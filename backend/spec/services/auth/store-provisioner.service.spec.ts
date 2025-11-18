import { describe, expect, it, jest } from '@jest/globals';
import { RequestContext } from '@vendure/core';
import { StoreProvisionerService } from '../../../src/services/auth/provisioning/store-provisioner.service';

const buildService = () => {
    const stockLocationService = {
        create: jest.fn(async () => ({ id: 5 })),
    };

    const channelAssignment = {
        assignStockLocationToChannel: jest.fn(async () => undefined),
    };

    const auditor = {
        logEntityCreated: jest.fn(async () => undefined),
    };

    const errorService = {
        logError: jest.fn(),
        wrapError: jest.fn((error: any) => error),
        createError: jest.fn((code: string, message: string) => new Error(`${code}: ${message}`)),
    };

    const service = new StoreProvisionerService(
        stockLocationService as any,
        channelAssignment as any,
        auditor as any,
        errorService as any,
    );

    return { service, stockLocationService, channelAssignment, auditor, errorService };
};

describe('StoreProvisionerService', () => {
    const ctx = {} as RequestContext;
    const registrationData = {
        companyName: 'Test Company',
        companyCode: 'test-company',
        currency: 'USD',
        adminFirstName: 'Jane',
        adminLastName: 'Doe',
        adminPhoneNumber: '0712345678',
        storeName: '  Primary Store  ',
        storeAddress: '123 Road',
    };

    it('creates stock location with trimmed store name and assigns to channel', async () => {
        const harness = buildService();

        const result = await harness.service.createAndAssignStore(
            ctx,
            registrationData as any,
            '2',
        );

        expect(harness.stockLocationService.create).toHaveBeenCalledWith(
            ctx,
            expect.objectContaining({ name: 'Primary Store' }),
        );
        expect(harness.channelAssignment.assignStockLocationToChannel).toHaveBeenCalledWith(
            ctx,
            5,
            '2',
        );
        expect(harness.auditor.logEntityCreated).toHaveBeenCalled();
        expect(result).toEqual({ id: 5 });
    });

    it('throws when store name is missing', async () => {
        const harness = buildService();
        harness.stockLocationService.create.mockImplementation(async () => ({ id: 5 }));

        await expect(
            harness.service.createAndAssignStore(
                ctx,
                { ...registrationData, storeName: '   ' } as any,
                '2',
            ),
        ).rejects.toThrow('Store name is required');
    });
});

