import { Injectable } from '@nestjs/common';
import { RequestContext, StockLocation, StockLocationService } from '@vendure/core';
import { RegistrationInput } from '../registration.service';
import { ChannelAssignmentService } from './channel-assignment.service';
import { RegistrationAuditorService } from './registration-auditor.service';
import { RegistrationErrorService } from './registration-error.service';

/**
 * Store Provisioner Service
 * 
 * Handles stock location (store/warehouse) creation and channel assignment.
 * LOB: Store = Physical location where inventory is tracked.
 */
@Injectable()
export class StoreProvisionerService {
    constructor(
        private readonly stockLocationService: StockLocationService,
        private readonly channelAssignment: ChannelAssignmentService,
        private readonly auditor: RegistrationAuditorService,
        private readonly errorService: RegistrationErrorService,
    ) { }

    /**
     * Create stock location and assign to channel
     */
    async createAndAssignStore(
        ctx: RequestContext,
        registrationData: RegistrationInput,
        channelId: string
    ): Promise<StockLocation> {
        try {
            // Create stock location
            const stockLocation = await this.createStockLocation(ctx, registrationData);
            
            // Assign to channel
            await this.channelAssignment.assignStockLocationToChannel(
                ctx,
                stockLocation.id,
                channelId as any
            );

            // Audit log
            await this.auditor.logEntityCreated(ctx, 'StockLocation', stockLocation.id.toString(), stockLocation, {
                channelId,
                storeName: registrationData.storeName,
                storeAddress: registrationData.storeAddress,
            });

            return stockLocation;
        } catch (error: any) {
            this.errorService.logError('StoreProvisioner', error, 'Store creation');
            throw this.errorService.wrapError(error, 'STOCK_LOCATION_CREATE_FAILED');
        }
    }

    private async createStockLocation(
        ctx: RequestContext,
        registrationData: RegistrationInput
    ): Promise<StockLocation> {
        const storeName = registrationData.storeName?.trim();

        if (!storeName) {
            throw this.errorService.createError(
                'REGISTRATION_STORE_NAME_REQUIRED',
                'Store name is required to complete registration.'
            );
        }

        const stockLocationResult = await this.stockLocationService.create(ctx, {
            name: storeName,
            description: registrationData.storeAddress?.trim() || '',
        });

        if ('errorCode' in stockLocationResult) {
            const error = stockLocationResult as any;
            throw this.errorService.createError(
                'STOCK_LOCATION_CREATE_FAILED',
                error.message || 'Failed to create stock location'
            );
        }

        return stockLocationResult as StockLocation;
    }
}

