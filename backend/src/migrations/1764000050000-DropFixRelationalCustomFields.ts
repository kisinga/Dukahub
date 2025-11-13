import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drop the __fix_relational_custom_fields__ workaround columns
 * that Vendure creates when only relational custom fields exist.
 * 
 * These columns are no longer needed since we've added scalar
 * custom fields (auditCreatedAt) to Order and Payment entities.
 */
export class DropFixRelationalCustomFields1764000050000 implements MigrationInterface {
    name = 'DropFixRelationalCustomFields1764000050000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop workaround columns from payment table
        await queryRunner.query(`
            DO $$
            BEGIN
                BEGIN
                    ALTER TABLE "payment" 
                    DROP COLUMN IF EXISTS "customFields__fix_relational_custom_fields__";
                EXCEPTION
                    WHEN undefined_column THEN
                        NULL; -- column doesn't exist, which is fine
                END;
            END $$;
        `);

        // Drop workaround columns from order table
        await queryRunner.query(`
            DO $$
            BEGIN
                BEGIN
                    ALTER TABLE "order" 
                    DROP COLUMN IF EXISTS "customFields__fix_relational_custom_fields__";
                EXCEPTION
                    WHEN undefined_column THEN
                        NULL; -- column doesn't exist, which is fine
                END;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Re-add columns if rolling back (though this shouldn't be necessary)
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'payment'
                      AND column_name = 'customFields__fix_relational_custom_fields__'
                ) THEN
                    ALTER TABLE "payment" 
                    ADD COLUMN "customFields__fix_relational_custom_fields__" boolean;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'order'
                      AND column_name = 'customFields__fix_relational_custom_fields__'
                ) THEN
                    ALTER TABLE "order" 
                    ADD COLUMN "customFields__fix_relational_custom_fields__" boolean;
                END IF;
            END $$;
        `);
    }
}

