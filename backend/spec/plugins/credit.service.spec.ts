import { Order, OrderService, RequestContext } from '@vendure/core';
import { CreditService } from '../../src/services/credit/credit.service';

describe('CreditService', () => {
    const ctx = {} as RequestContext;

    const createOrderService = (): OrderService => {
        return {} as OrderService;
    };

    const createConnection = (orders: Order[] = []) => {
        const findOneMock = jest.fn().mockImplementation(async () => ({
            id: 'CUST_1',
            customFields: {
                isCreditApproved: true,
                creditLimit: 1000,
                outstandingAmount: 200, // This field is deprecated but may still exist
            },
        }));

        const saveMock = jest.fn();
        
        // Mock for Order repository queries (used by calculateOutstandingAmount)
        const findOrdersMock = jest.fn().mockResolvedValue(orders);

        const connection = {
            getRepository: jest.fn().mockImplementation((ctx, entity) => {
                // Return Order repository mock when querying for Order
                // Check by constructor name or use a more reliable method
                if (entity === Order || (entity && entity.name === 'Order')) {
                    return {
                        find: findOrdersMock,
                    };
                }
                // Return Customer repository mock for Customer queries
                return {
                    findOne: findOneMock,
                    save: saveMock,
                };
            }),
        } as any;

        return { connection, findOneMock, saveMock, findOrdersMock };
    };

    it('computes available credit from summary', async () => {
        const { connection } = createConnection([]); // No orders, so outstanding amount should be 0
        const orderService = createOrderService();
        const service = new CreditService(connection, orderService);

        const summary = await service.getCreditSummary(ctx, 'CUST_1');

        expect(summary).toMatchObject({
            customerId: 'CUST_1',
            isCreditApproved: true,
            creditLimit: 1000,
            outstandingAmount: 0, // Calculated dynamically from orders (empty array)
            availableCredit: 1000, // creditLimit - outstandingAmount = 1000 - 0
        });
    });

    it('computes available credit with outstanding orders', async () => {
        // Create orders with total of 20000 cents (200 base units)
        const orders: Order[] = [
            {
                id: 'ORDER_1',
                total: 20000, // 200 in base units (cents)
                state: 'ArrangingPayment',
                payments: [],
            } as unknown as Order,
        ];
        const { connection } = createConnection(orders);
        const orderService = createOrderService();
        const service = new CreditService(connection, orderService);

        const summary = await service.getCreditSummary(ctx, 'CUST_1');

        expect(summary).toMatchObject({
            customerId: 'CUST_1',
            isCreditApproved: true,
            creditLimit: 1000,
            outstandingAmount: 200, // 20000 cents / 100 = 200 base units
            availableCredit: 800, // creditLimit - outstandingAmount = 1000 - 200
        });
    });

    it('applies credit charge is a no-op (deprecated)', async () => {
        const { connection, saveMock } = createConnection();
        const orderService = createOrderService();
        const service = new CreditService(connection, orderService);

        await service.applyCreditCharge(ctx, 'CUST_1', 150);

        // applyCreditCharge is deprecated and does nothing (no-op)
        expect(saveMock).not.toHaveBeenCalled();
    });

    it('releases credit charge updates repayment tracking fields', async () => {
        const { connection, saveMock } = createConnection();
        const orderService = createOrderService();
        const service = new CreditService(connection, orderService);

        await service.releaseCreditCharge(ctx, 'CUST_1', 150);

        // releaseCreditCharge updates lastRepaymentDate and lastRepaymentAmount
        expect(saveMock).toHaveBeenCalledTimes(1);
        const savedCustomer = saveMock.mock.calls[0][0];
        expect(savedCustomer.customFields).toMatchObject({
            lastRepaymentDate: expect.any(Date),
            lastRepaymentAmount: 150,
            // Other existing fields are preserved
            isCreditApproved: true,
            creditLimit: 1000,
        });
        // Note: outstandingAmount may still exist in customFields from the mock,
        // but it's not used - the actual outstanding amount is calculated dynamically
    });

    it('releases credit charge does nothing for zero or negative amounts', async () => {
        const { connection, saveMock } = createConnection();
        const orderService = createOrderService();
        const service = new CreditService(connection, orderService);

        await service.releaseCreditCharge(ctx, 'CUST_1', 0);
        expect(saveMock).not.toHaveBeenCalled();

        await service.releaseCreditCharge(ctx, 'CUST_1', -10);
        expect(saveMock).not.toHaveBeenCalled();
    });
});

