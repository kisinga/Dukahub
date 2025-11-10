import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeSubscriptionTierColumn1761900000002 implements MigrationInterface {
    name = 'NormalizeSubscriptionTierColumn1761900000002';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsSubscriptionTierId'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME COLUMN "customFieldsSubscriptionTierId" TO "customFieldsSubscriptiontierid";
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                -- Rename legacy constraint if it still targets the legacy column
                IF EXISTS (
                    SELECT 1
                    FROM pg_constraint con
                    JOIN pg_class rel ON rel.oid = con.conrelid
                    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                    WHERE con.conname = 'FK_channel_subscription_tier'
                        AND nsp.nspname = current_schema()
                        AND rel.relname = 'channel'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME CONSTRAINT "FK_channel_subscription_tier" TO "FK_cfa828418e58de180707fd03e1a";
                END IF;

                -- Drop conflicting FK if it exists but is attached to wrong column
                IF EXISTS (
                    SELECT 1
                    FROM pg_constraint con
                    JOIN pg_class rel ON rel.oid = con.conrelid
                    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                    WHERE con.conname = 'FK_cfa828418e58de180707fd03e1a'
                        AND nsp.nspname = current_schema()
                        AND rel.relname = 'channel'
                ) AND NOT EXISTS (
                    SELECT 1
                    FROM information_schema.constraint_column_usage
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsSubscriptiontierid'
                        AND constraint_name = 'FK_cfa828418e58de180707fd03e1a'
                ) THEN
                    ALTER TABLE "channel"
                        DROP CONSTRAINT "FK_cfa828418e58de180707fd03e1a";
                END IF;

                -- Ensure FK exists with the normalized column
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.constraint_column_usage
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsSubscriptiontierid'
                        AND constraint_name = 'FK_cfa828418e58de180707fd03e1a'
                ) THEN
                    ALTER TABLE "channel"
                        ADD CONSTRAINT "FK_cfa828418e58de180707fd03e1a"
                        FOREIGN KEY ("customFieldsSubscriptiontierid")
                        REFERENCES "subscription_tier"("id")
                        ON DELETE SET NULL
                        ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsSubscriptiontierid'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME COLUMN "customFieldsSubscriptiontierid" TO "customFieldsSubscriptionTierId";
                END IF;
            END $$;
        `);
    }
}


