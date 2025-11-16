import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Account } from '../../ledger/account.entity';

/**
 * Chart of Accounts Service
 * 
 * Manages initialization of required accounts for channels.
 * Should be called when a new channel is created.
 */
@Injectable()
export class ChartOfAccountsService {
    private readonly logger = new Logger(ChartOfAccountsService.name);

    constructor(private readonly dataSource: DataSource) { }

    /**
     * Initialize Chart of Accounts for a channel
     * Creates all required accounts if they don't exist
     */
    async initializeForChannel(channelId: number): Promise<void> {
        const accountRepo = this.dataSource.getRepository(Account);

        const requiredAccounts = [
            // Assets
            { code: 'CASH_ON_HAND', name: 'Cash on Hand', type: 'asset' as const },
            { code: 'BANK_MAIN', name: 'Bank - Main', type: 'asset' as const },
            { code: 'CLEARING_MPESA', name: 'Clearing - M-Pesa', type: 'asset' as const },
            { code: 'CLEARING_CREDIT', name: 'Clearing - Customer Credit', type: 'asset' as const },
            { code: 'CLEARING_GENERIC', name: 'Clearing - Generic', type: 'asset' as const },
            // Income
            { code: 'SALES', name: 'Sales Revenue', type: 'income' as const },
            { code: 'SALES_RETURNS', name: 'Sales Returns', type: 'income' as const },
            // Assets (continued - AR is an asset)
            { code: 'ACCOUNTS_RECEIVABLE', name: 'Accounts Receivable', type: 'asset' as const },
            // Liabilities
            { code: 'ACCOUNTS_PAYABLE', name: 'Accounts Payable', type: 'liability' as const },
            { code: 'TAX_PAYABLE', name: 'Taxes Payable', type: 'liability' as const },
            // Expenses
            { code: 'PURCHASES', name: 'Inventory Purchases', type: 'expense' as const },
            { code: 'EXPENSES', name: 'General Expenses', type: 'expense' as const },
            { code: 'PROCESSOR_FEES', name: 'Payment Processor Fees', type: 'expense' as const },
            { code: 'CASH_SHORT_OVER', name: 'Cash Short/Over', type: 'expense' as const },
        ];

        for (const account of requiredAccounts) {
            const existing = await accountRepo.findOne({
                where: {
                    channelId,
                    code: account.code,
                },
            });

            if (!existing) {
                await accountRepo.save({
                    channelId,
                    code: account.code,
                    name: account.name,
                    type: account.type,
                    isActive: true,
                });
                this.logger.log(`Created account ${account.code} for channel ${channelId}`);
            }
        }

        this.logger.log(`Chart of Accounts initialized for channel ${channelId}`);
    }

    /**
     * Verify all required accounts exist for a channel
     * Throws if any are missing
     */
    async verifyChannelAccounts(channelId: number): Promise<void> {
        const accountRepo = this.dataSource.getRepository(Account);
        const requiredCodes = [
            'CASH_ON_HAND', 'BANK_MAIN', 'CLEARING_MPESA', 'CLEARING_CREDIT', 'CLEARING_GENERIC',
            'SALES', 'SALES_RETURNS',
            'ACCOUNTS_RECEIVABLE', 'ACCOUNTS_PAYABLE', 'TAX_PAYABLE',
            'PURCHASES', 'EXPENSES', 'PROCESSOR_FEES', 'CASH_SHORT_OVER',
        ];

        const existing = await accountRepo.find({
            where: {
                channelId,
                code: requiredCodes as any,
            },
        });

        const found = new Set(existing.map(a => a.code));
        const missing = requiredCodes.filter(code => !found.has(code));

        if (missing.length > 0) {
            throw new Error(
                `Missing required accounts for channel ${channelId}: ${missing.join(', ')}. ` +
                `Please run ChartOfAccountsService.initializeForChannel(${channelId})`
            );
        }
    }
}

