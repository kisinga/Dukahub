-- Rollback migration 1765000000000-FixStockLocationIdType
-- Run this BEFORE running the new FixForeignKeyTypesToInteger migration
-- This reverts stockLocationId from varchar back to uuid

-- Note: This will fail if there are non-UUID values in these columns
-- If that's the case, you'll need to clean up the data first

BEGIN;

-- Rollback stock_purchase_line.stockLocationId
ALTER TABLE "stock_purchase_line" 
ALTER COLUMN "stockLocationId" TYPE uuid USING "stockLocationId"::uuid;

-- Rollback inventory_stock_adjustment_line.stockLocationId  
ALTER TABLE "inventory_stock_adjustment_line" 
ALTER COLUMN "stockLocationId" TYPE uuid USING "stockLocationId"::uuid;

-- Remove migration record (adjust table name if needed)
-- DELETE FROM migrations WHERE name = 'FixStockLocationIdType1765000000000';

COMMIT;

