import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameSubscriptionTierColumn1761900000001 implements MigrationInterface {
    name = 'RenameSubscriptionTierColumn1761900000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
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
                    NULL; -- already normalized
                ELSIF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsSubscriptionTierId'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME COLUMN "customFieldsSubscriptionTierId" TO "customFieldsSubscriptiontierid";
                ELSIF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsSubscriptiontieridid'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME COLUMN "customFieldsSubscriptiontieridid" TO "customFieldsSubscriptiontierid";
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                -- Normalize legacy constraint name if present
                IF EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'FK_channel_subscription_tier'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME CONSTRAINT "FK_channel_subscription_tier" TO "FK_cfa828418e58de180707fd03e1a";
                END IF;

                -- Drop conflicting constraint that references unexpected column
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
                    WHERE constraint_name = 'FK_cfa828418e58de180707fd03e1a'
                        AND table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsSubscriptiontierid'
                ) THEN
                    ALTER TABLE "channel"
                        DROP CONSTRAINT "FK_cfa828418e58de180707fd03e1a";
                END IF;

                -- Ensure the normalized constraint exists with correct definition
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.constraint_column_usage
                    WHERE constraint_name = 'FK_cfa828418e58de180707fd03e1a'
                        AND table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsSubscriptiontierid'
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
                ELSIF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsSubscriptiontieridid'
                ) THEN
                    NULL;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                -- Drop normalized constraint if it still targets the normalized column
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.constraint_column_usage
                    WHERE constraint_name = 'FK_cfa828418e58de180707fd03e1a'
                        AND table_schema = current_schema()
                        AND table_name = 'channel'
                ) THEN
                    ALTER TABLE "channel"
                        DROP CONSTRAINT "FK_cfa828418e58de180707fd03e1a";
                END IF;

                -- Recreate the legacy constraint only if the legacy column exists
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsSubscriptiontieridid'
                ) THEN
                    ALTER TABLE "channel"
                        ADD CONSTRAINT "FK_channel_subscription_tier"
                        FOREIGN KEY ("customFieldsSubscriptiontieridid")
                        REFERENCES "subscription_tier"("id")
                        ON DELETE SET NULL
                        ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);
    }
}


