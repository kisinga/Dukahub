import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeSubscriptionFieldsCasing1761900000003 implements MigrationInterface {
    name = 'NormalizeSubscriptionFieldsCasing1761900000003';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsSubscriptionStatus'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsSubscriptionstatus'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME COLUMN "customFieldsSubscriptionStatus" TO "customFieldsSubscriptionstatus";
                END IF;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsTrialEndsAt'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsTrialendsat'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME COLUMN "customFieldsTrialEndsAt" TO "customFieldsTrialendsat";
                END IF;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsSubscriptionStartedAt'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsSubscriptionstartedat'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME COLUMN "customFieldsSubscriptionStartedAt" TO "customFieldsSubscriptionstartedat";
                END IF;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsSubscriptionExpiresAt'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsSubscriptionexpiresat'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME COLUMN "customFieldsSubscriptionExpiresAt" TO "customFieldsSubscriptionexpiresat";
                END IF;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsBillingCycle'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsBillingcycle'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME COLUMN "customFieldsBillingCycle" TO "customFieldsBillingcycle";
                END IF;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsPaystackCustomerCode'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsPaystackcustomercode'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME COLUMN "customFieldsPaystackCustomerCode" TO "customFieldsPaystackcustomercode";
                END IF;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsPaystackSubscriptionCode'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsPaystacksubscriptioncode'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME COLUMN "customFieldsPaystackSubscriptionCode" TO "customFieldsPaystacksubscriptioncode";
                END IF;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsLastPaymentDate'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsLastpaymentdate'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME COLUMN "customFieldsLastPaymentDate" TO "customFieldsLastpaymentdate";
                END IF;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsLastPaymentAmount'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsLastpaymentamount'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME COLUMN "customFieldsLastPaymentAmount" TO "customFieldsLastpaymentamount";
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsSubscriptionstatus'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsSubscriptionStatus'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME COLUMN "customFieldsSubscriptionstatus" TO "customFieldsSubscriptionStatus";
                END IF;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsTrialendsat'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsTrialEndsAt'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME COLUMN "customFieldsTrialendsat" TO "customFieldsTrialEndsAt";
                END IF;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsSubscriptionstartedat'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsSubscriptionStartedAt'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME COLUMN "customFieldsSubscriptionstartedat" TO "customFieldsSubscriptionStartedAt";
                END IF;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsSubscriptionexpiresat'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsSubscriptionExpiresAt'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME COLUMN "customFieldsSubscriptionexpiresat" TO "customFieldsSubscriptionExpiresAt";
                END IF;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsBillingcycle'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsBillingCycle'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME COLUMN "customFieldsBillingcycle" TO "customFieldsBillingCycle";
                END IF;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsPaystackcustomercode'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsPaystackCustomerCode'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME COLUMN "customFieldsPaystackcustomercode" TO "customFieldsPaystackCustomerCode";
                END IF;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsPaystacksubscriptioncode'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsPaystackSubscriptionCode'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME COLUMN "customFieldsPaystacksubscriptioncode" TO "customFieldsPaystackSubscriptionCode";
                END IF;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsLastpaymentdate'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsLastPaymentDate'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME COLUMN "customFieldsLastpaymentdate" TO "customFieldsLastPaymentDate";
                END IF;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsLastpaymentamount'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                        AND table_name = 'channel'
                        AND column_name = 'customFieldsLastPaymentAmount'
                ) THEN
                    ALTER TABLE "channel"
                        RENAME COLUMN "customFieldsLastpaymentamount" TO "customFieldsLastPaymentAmount";
                END IF;
            END $$;
        `);
    }
}


