import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { STOCK_ADMIN_SCHEMA } from './stock.schema';
import { StockResolver } from './stock.resolver';
import { ManageStockAdjustmentsPermission } from './permissions';
import { StockManagementService } from '../../services/stock/stock-management.service';
import { StockMovementService } from '../../services/stock/stock-movement.service';
import { PurchaseService } from '../../services/stock/purchase.service';
import { StockAdjustmentService } from '../../services/stock/stock-adjustment.service';
import { StockQueryService } from '../../services/stock/stock-query.service';
import { StockValidationService } from '../../services/stock/stock-validation.service';
import { StockPurchase, StockPurchaseLine } from '../../services/stock/entities/purchase.entity';
import { InventoryStockAdjustment, InventoryStockAdjustmentLine } from '../../services/stock/entities/stock-adjustment.entity';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        StockValidationService,
        StockMovementService,
        PurchaseService,
        StockAdjustmentService,
        StockManagementService,
        StockQueryService,
        StockResolver,
    ],
    configuration: (config) => {
        // Register custom permission
        config.authOptions.customPermissions = [
            ...(config.authOptions.customPermissions || []),
            ManageStockAdjustmentsPermission,
        ];
        return config;
    },
    adminApiExtensions: {
        schema: STOCK_ADMIN_SCHEMA,
        resolvers: [StockResolver],
    },
    entities: [
        StockPurchase,
        StockPurchaseLine,
        InventoryStockAdjustment,
        InventoryStockAdjustmentLine,
    ],
})
export class StockPlugin { }

