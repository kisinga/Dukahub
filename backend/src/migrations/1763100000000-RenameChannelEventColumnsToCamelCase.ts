import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to rename lowercase custom field columns to camelCase
 * 
 * This migration handles the case where the previous migration created columns
 * with lowercase names (e.g., customFieldseventconfig) but Vendure expects
 * camelCase (e.g., customFieldsEventconfig).
 * 
 * This migration is idempotent and safe to run multiple times.
 */
export class RenameChannelEventColumnsToCamelCase1763100000000 implements MigrationInterface {
    name = 'RenameChannelEventColumnsToCamelCase1763100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Rename channel table columns from lowercase to camelCase
        await queryRunner.query(`
            DO $$
            BEGIN
                -- Rename eventConfig
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'channel' AND column_name = 'customFieldseventconfig'
                ) THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldseventconfig" TO "customFieldsEventconfig";
                END IF;

                -- Rename AUTHENTICATION category columns
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncountauthotp') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncountauthotp" TO "customFieldsActioncountauthotp";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncountauthtotal') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncountauthtotal" TO "customFieldsActioncountauthtotal";
                END IF;

                -- Rename CUSTOMER_COMMUNICATION category columns
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

                -- Rename SYSTEM_NOTIFICATIONS category columns
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

                -- Rename global tracking columns
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactioncounttotal') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactioncounttotal" TO "customFieldsActioncounttotal";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactiontrackinglastresetdate') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactiontrackinglastresetdate" TO "customFieldsActiontrackinglastresetdate";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsactiontrackingresettype') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsactiontrackingresettype" TO "customFieldsActiontrackingresettype";
                END IF;

                -- Rename user table column
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'customFieldsnotificationpreferences') THEN
                    ALTER TABLE "user" RENAME COLUMN "customFieldsnotificationpreferences" TO "customFieldsNotificationpreferences";
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    -- Log error but don't fail migration
                    RAISE NOTICE 'Error renaming columns: %', SQLERRM;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverse the renames (camelCase back to lowercase)
        await queryRunner.query(`
            DO $$
            BEGIN
                -- Reverse rename eventConfig
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'channel' AND column_name = 'customFieldsEventconfig'
                ) THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsEventconfig" TO "customFieldseventconfig";
                END IF;

                -- Reverse rename AUTHENTICATION columns
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActioncountauthotp') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActioncountauthotp" TO "customFieldsactioncountauthotp";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActioncountauthtotal') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActioncountauthtotal" TO "customFieldsactioncountauthtotal";
                END IF;

                -- Reverse rename CUSTOMER_COMMUNICATION columns
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActioncountcommcustomercreated') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActioncountcommcustomercreated" TO "customFieldsactioncountcommcustomercreated";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActioncountcommcreditapproved') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActioncountcommcreditapproved" TO "customFieldsactioncountcommcreditapproved";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActioncountcommbalancechanged') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActioncountcommbalancechanged" TO "customFieldsactioncountcommbalancechanged";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActioncountcommrepaymentdeadline') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActioncountcommrepaymentdeadline" TO "customFieldsactioncountcommrepaymentdeadline";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActioncountcommtotal') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActioncountcommtotal" TO "customFieldsactioncountcommtotal";
                END IF;

                -- Reverse rename SYSTEM_NOTIFICATIONS columns
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActioncountsysorderpaymentsettled') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActioncountsysorderpaymentsettled" TO "customFieldsactioncountsysorderpaymentsettled";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActioncountsysorderfulfilled') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActioncountsysorderfulfilled" TO "customFieldsactioncountsysorderfulfilled";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActioncountsysordercancelled') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActioncountsysordercancelled" TO "customFieldsactioncountsysordercancelled";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActioncountsysstocklowalert') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActioncountsysstocklowalert" TO "customFieldsactioncountsysstocklowalert";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActioncountsysmltrainingstarted') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActioncountsysmltrainingstarted" TO "customFieldsactioncountsysmltrainingstarted";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActioncountsysmltrainingprogress') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActioncountsysmltrainingprogress" TO "customFieldsactioncountsysmltrainingprogress";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActioncountsysmltrainingcompleted') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActioncountsysmltrainingcompleted" TO "customFieldsactioncountsysmltrainingcompleted";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActioncountsysmltrainingfailed') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActioncountsysmltrainingfailed" TO "customFieldsactioncountsysmltrainingfailed";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActioncountsyspaymentconfirmed') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActioncountsyspaymentconfirmed" TO "customFieldsactioncountsyspaymentconfirmed";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActioncountsysadmincreated') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActioncountsysadmincreated" TO "customFieldsactioncountsysadmincreated";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActioncountsysadminupdated') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActioncountsysadminupdated" TO "customFieldsActioncountsysadminupdated";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActioncountsysusercreated') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActioncountsysusercreated" TO "customFieldsactioncountsysusercreated";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActioncountsysuserupdated') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActioncountsysuserupdated" TO "customFieldsactioncountsysuserupdated";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActioncountsystotal') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActioncountsystotal" TO "customFieldsactioncountsystotal";
                END IF;

                -- Reverse rename global tracking columns
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActioncounttotal') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActioncounttotal" TO "customFieldsactioncounttotal";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActiontrackinglastresetdate') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActiontrackinglastresetdate" TO "customFieldsactiontrackinglastresetdate";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel' AND column_name = 'customFieldsActiontrackingresettype') THEN
                    ALTER TABLE "channel" RENAME COLUMN "customFieldsActiontrackingresettype" TO "customFieldsactiontrackingresettype";
                END IF;

                -- Reverse rename user table column
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'customFieldsNotificationpreferences') THEN
                    ALTER TABLE "user" RENAME COLUMN "customFieldsNotificationpreferences" TO "customFieldsnotificationpreferences";
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'Error reversing column renames: %', SQLERRM;
            END $$;
        `);
    }
}

