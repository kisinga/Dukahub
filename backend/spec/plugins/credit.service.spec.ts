import { RequestContext } from '@vendure/core';
import { CreditService } from '../../src/plugins/credit/credit.service';

describe('CreditService', () => {
    const ctx = {} as RequestContext;

    const createConnection = () => {
        const findOneMock = jest.fn().mockImplementation(async () => ({
            id: 'CUST_1',
            customFields: {
                isCreditApproved: true,
                creditLimit: 1000,
                outstandingAmount: 200,
            },
        }));

        const saveMock = jest.fn();

        const connection = {
            getRepository: jest.fn().mockReturnValue({
                findOne: findOneMock,
                save: saveMock,
            }),
        } as any;

        return { connection, findOneMock, saveMock };
    };

    it('computes available credit from summary', async () => {
        const { connection } = createConnection();
        const service = new CreditService(connection);

        const summary = await service.getCreditSummary(ctx, 'CUST_1');

        expect(summary).toMatchObject({
            customerId: 'CUST_1',
            isCreditApproved: true,
            creditLimit: 1000,
            outstandingAmount: 200,
            availableCredit: 800,
        });
    });

    it('applies credit charge by reducing outstanding amount', async () => {
        const { connection, saveMock } = createConnection();
        const service = new CreditService(connection);

        await service.applyCreditCharge(ctx, 'CUST_1', 150);

        expect(saveMock).toHaveBeenCalledWith(
            expect.objectContaining({
                customFields: expect.objectContaining({
                    outstandingAmount: 50,
                }),
            })
        );
    });

    it('releases credit charge by increasing outstanding amount', async () => {
        const { connection, saveMock } = createConnection();
        const service = new CreditService(connection);

        await service.releaseCreditCharge(ctx, 'CUST_1', 150);

        expect(saveMock).toHaveBeenCalledWith(
            expect.objectContaining({
                customFields: expect.objectContaining({
                    outstandingAmount: 350,
                }),
            })
        );
    });
});

