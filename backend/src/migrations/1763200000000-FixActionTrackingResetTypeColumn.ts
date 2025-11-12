import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to fix the actionTrackingResetType column type
 * 
 * Ensures the column has the correct type: character varying(255) NOT NULL DEFAULT 'monthly'
 */
export class FixActionTrackingResetTypeColumn1763200000000 implements MigrationInterface {
    name = 'FixActionTrackingResetTypeColumn1763200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                -- Check if column exists
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'channel' 
                    AND column_name = 'customFieldsActiontrackingresettype'
                ) THEN
                    -- Update the column to have correct type and constraints
                    ALTER TABLE "channel" 
                    ALTER COLUMN "customFieldsActiontrackingresettype" 
                    TYPE character varying(255);
                    
                    -- Set NOT NULL constraint if not already set
                    ALTER TABLE "channel" 
                    ALTER COLUMN "customFieldsActiontrackingresettype" 
                    SET NOT NULL;
                    
                    -- Set default value if not already set
                    ALTER TABLE "channel" 
                    ALTER COLUMN "customFieldsActiontrackingresettype" 
                    SET DEFAULT 'monthly';
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'Error fixing actionTrackingResetType column: %', SQLERRM;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No need to reverse - this is just a type fix
    }
}

