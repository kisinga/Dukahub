import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChannelEventTrackingFields1763000000000 implements MigrationInterface {
    name = 'AddChannelEventTrackingFields1763000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add eventConfig field (Vendure expects camelCase: customFieldsEventconfig)
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsEventconfig" text
        `);

        // Rename existing lowercase AUTHENTICATION columns if they exist
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncountauthotp') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncountauthotp" TO "customFieldsActioncountauthotp";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncountauthtotal') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncountauthtotal" TO "customFieldsActioncountauthtotal";
                END IF;
            EXCEPTION
                WHEN undefined_column THEN NULL;
            END $$;
        `);

        // AUTHENTICATION category fields (Vendure expects camelCase: customFieldsActioncountauthotp)
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActioncountauthotp" integer NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActioncountauthtotal" integer NOT NULL DEFAULT 0
        `);

        // Rename existing lowercase CUSTOMER_COMMUNICATION columns if they exist
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncountcommcustomercreated') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncountcommcustomercreated" TO "customFieldsActioncountcommcustomercreated";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncountcommcreditapproved') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncountcommcreditapproved" TO "customFieldsActioncountcommcreditapproved";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncountcommbalancechanged') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncountcommbalancechanged" TO "customFieldsActioncountcommbalancechanged";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncountcommrepaymentdeadline') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncountcommrepaymentdeadline" TO "customFieldsActioncountcommrepaymentdeadline";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncountcommtotal') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncountcommtotal" TO "customFieldsActioncountcommtotal";
                END IF;
            EXCEPTION
                WHEN undefined_column THEN NULL;
            END $$;
        `);

        // CUSTOMER_COMMUNICATION category fields
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActioncountcommcustomercreated" integer NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActioncountcommcreditapproved" integer NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActioncountcommbalancechanged" integer NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActioncountcommrepaymentdeadline" integer NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActioncountcommtotal" integer NOT NULL DEFAULT 0
        `);

        // Rename existing lowercase SYSTEM_NOTIFICATIONS columns if they exist
        await queryRunner.query(`
            DO $$
            BEGIN
                -- Rename all system notification columns
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncountsysorderpaymentsettled') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncountsysorderpaymentsettled" TO "customFieldsActioncountsysorderpaymentsettled";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncountsysorderfulfilled') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncountsysorderfulfilled" TO "customFieldsActioncountsysorderfulfilled";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncountsysordercancelled') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncountsysordercancelled" TO "customFieldsActioncountsysordercancelled";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncountsysstocklowalert') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncountsysstocklowalert" TO "customFieldsActioncountsysstocklowalert";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncountsysmltrainingstarted') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncountsysmltrainingstarted" TO "customFieldsActioncountsysmltrainingstarted";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncountsysmltrainingprogress') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncountsysmltrainingprogress" TO "customFieldsActioncountsysmltrainingprogress";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncountsysmltrainingcompleted') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncountsysmltrainingcompleted" TO "customFieldsActioncountsysmltrainingcompleted";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncountsysmltrainingfailed') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncountsysmltrainingfailed" TO "customFieldsActioncountsysmltrainingfailed";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncountsyspaymentconfirmed') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncountsyspaymentconfirmed" TO "customFieldsActioncountsyspaymentconfirmed";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncountsysadmincreated') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncountsysadmincreated" TO "customFieldsActioncountsysadmincreated";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncountsysadminupdated') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncountsysadminupdated" TO "customFieldsActioncountsysadminupdated";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncountsysusercreated') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncountsysusercreated" TO "customFieldsActioncountsysusercreated";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncountsysuserupdated') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncountsysuserupdated" TO "customFieldsActioncountsysuserupdated";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncountsystotal') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncountsystotal" TO "customFieldsActioncountsystotal";
                END IF;
            EXCEPTION
                WHEN undefined_column THEN NULL;
            END $$;
        `);

        // SYSTEM_NOTIFICATIONS category fields
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActioncountsysorderpaymentsettled" integer NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActioncountsysorderfulfilled" integer NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActioncountsysordercancelled" integer NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActioncountsysstocklowalert" integer NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActioncountsysmltrainingstarted" integer NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActioncountsysmltrainingprogress" integer NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActioncountsysmltrainingcompleted" integer NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActioncountsysmltrainingfailed" integer NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActioncountsyspaymentconfirmed" integer NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActioncountsysadmincreated" integer NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActioncountsysadminupdated" integer NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActioncountsysusercreated" integer NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActioncountsysuserupdated" integer NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActioncountsystotal" integer NOT NULL DEFAULT 0
        `);

        // Rename existing lowercase global tracking columns if they exist
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncounttotal') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncounttotal" TO "customFieldsActioncounttotal";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactiontrackinglastresetdate') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactiontrackinglastresetdate" TO "customFieldsActiontrackinglastresetdate";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactiontrackingresettype') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactiontrackingresettype" TO "customFieldsActiontrackingresettype";
                END IF;
            EXCEPTION
                WHEN undefined_column THEN NULL;
            END $$;
        `);

        // Global tracking fields
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActioncounttotal" integer NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActiontrackinglastresetdate" TIMESTAMP
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            ADD COLUMN IF NOT EXISTS "customFieldsActiontrackingresettype" character varying NOT NULL DEFAULT 'monthly'
        `);

        // Rename user notificationPreferences if it exists with lowercase name
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'customFieldsnotificationpreferences') THEN
                    ALTER TABLE "user" RENAME COLUMN "customFieldsnotificationpreferences" TO "customFieldsNotificationpreferences";
                END IF;
            EXCEPTION
                WHEN undefined_column THEN NULL;
            END $$;
        `);

        // Add notificationPreferences to user table
        await queryRunner.query(`
            ALTER TABLE "user"
            ADD COLUMN IF NOT EXISTS "customFieldsNotificationpreferences" text
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove user notification preferences
        await queryRunner.query(`
            ALTER TABLE "user"
            DROP COLUMN IF EXISTS "customFieldsNotificationpreferences"
        `);

        // Remove global tracking fields
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActiontrackingresettype"
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActiontrackinglastresetdate"
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActioncounttotal"
        `);

        // Remove SYSTEM_NOTIFICATIONS fields
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActioncountsysuserupdated"
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActioncountsysusercreated"
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActioncountsysadminupdated"
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActioncountsysadmincreated"
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActioncountsyspaymentconfirmed"
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActioncountsysmltrainingfailed"
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActioncountsysmltrainingcompleted"
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActioncountsysmltrainingprogress"
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActioncountsysmltrainingstarted"
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActioncountsysstocklowalert"
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActioncountsysordercancelled"
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActioncountsysorderfulfilled"
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActioncountsysorderpaymentsettled"
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActioncountsystotal"
        `);

        // Remove CUSTOMER_COMMUNICATION fields
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActioncountcommtotal"
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActioncountcommrepaymentdeadline"
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActioncountcommbalancechanged"
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActioncountcommcreditapproved"
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActioncountcommcustomercreated"
        `);

        // Remove AUTHENTICATION fields
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActioncountauthtotal"
        `);
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsActioncountauthotp"
        `);

        // Remove eventConfig
        await queryRunner.query(`
            ALTER TABLE "channel"
            DROP COLUMN IF EXISTS "customFieldsEventconfig"
        `);
    }
}

