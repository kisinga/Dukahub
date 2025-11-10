import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionFields1761900000000 implements MigrationInterface {
    name = 'AddSubscriptionFields1761900000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create subscription_tier table (check if exists first to avoid duplicate type error)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "subscription_tier" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "code" character varying(255) NOT NULL,
                "name" character varying(255) NOT NULL,
                "description" text,
                "priceMonthly" integer NOT NULL,
                "priceYearly" integer NOT NULL,
                "features" jsonb,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_subscription_tier" PRIMARY KEY ("id")
            )
        `, undefined);

        // Add unique constraint separately to avoid conflicts
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'UQ_f4afafa5c0e63ab4eb176ac22f8'
                ) THEN
                    ALTER TABLE "subscription_tier" 
                    ADD CONSTRAINT "UQ_f4afafa5c0e63ab4eb176ac22f8" UNIQUE ("code");
                END IF;
            END $$;
        `, undefined);

        // Add Channel custom fields for subscription (matching TypeORM's camelCase convention)
        // Note: TypeORM generates column names based on custom field names with camelCase
        await queryRunner.query(`
            ALTER TABLE "channel" 
            ADD COLUMN IF NOT EXISTS "customFieldsSubscriptiontierid" uuid
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "channel" 
            ADD COLUMN IF NOT EXISTS "customFieldsSubscriptionstatus" character varying(255) NOT NULL DEFAULT 'trial'
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "channel" 
            ADD COLUMN IF NOT EXISTS "customFieldsTrialendsat" TIMESTAMP
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "channel" 
            ADD COLUMN IF NOT EXISTS "customFieldsSubscriptionstartedat" TIMESTAMP
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "channel" 
            ADD COLUMN IF NOT EXISTS "customFieldsSubscriptionexpiresat" TIMESTAMP
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "channel" 
            ADD COLUMN IF NOT EXISTS "customFieldsBillingcycle" character varying(255)
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "channel" 
            ADD COLUMN IF NOT EXISTS "customFieldsPaystackcustomercode" character varying(255)
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "channel" 
            ADD COLUMN IF NOT EXISTS "customFieldsPaystacksubscriptioncode" character varying(255)
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "channel" 
            ADD COLUMN IF NOT EXISTS "customFieldsLastpaymentdate" TIMESTAMP
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "channel" 
            ADD COLUMN IF NOT EXISTS "customFieldsLastpaymentamount" integer
        `, undefined);

        // Add foreign key constraint for subscription tier
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'FK_cfa828418e58de180707fd03e1a'
                ) THEN
                    ALTER TABLE "channel" 
                        ADD CONSTRAINT "FK_cfa828418e58de180707fd03e1a" 
                        FOREIGN KEY ("customFieldsSubscriptiontierid") 
                        REFERENCES "subscription_tier"("id") 
                        ON DELETE NO ACTION 
                        ON UPDATE NO ACTION;
                END IF;
            END $$;
        `, undefined);

        // Seed default subscription tier (Basic Plan)
        await queryRunner.query(`
            INSERT INTO "subscription_tier" ("code", "name", "description", "priceMonthly", "priceYearly", "features", "isActive", "createdAt", "updatedAt")
            VALUES (
                'basic-tier',
                'Basic Plan',
                'Essential features for small businesses',
                5000,
                50000,
                '{"features": ["Unlimited products", "Order management", "Inventory tracking", "Basic reporting"]}'::jsonb,
                true,
                now(),
                now()
            )
            ON CONFLICT ("code") DO NOTHING
        `, undefined);

        // Set existing channels to trial status with trialEndsAt = createdAt + 30 days
        await queryRunner.query(`
            UPDATE "channel"
            SET 
                "customFieldsSubscriptionstatus" = 'trial',
                "customFieldsTrialendsat" = COALESCE("createdAt", now()) + INTERVAL '30 days'
            WHERE "customFieldsTrialendsat" IS NULL
        `, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "channel" 
            DROP CONSTRAINT IF EXISTS "FK_cfa828418e58de180707fd03e1a"
        `, undefined);

        // Remove Channel custom fields
        await queryRunner.query(`
            ALTER TABLE "channel" 
            DROP COLUMN IF EXISTS "customFieldsSubscriptiontierid"
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "channel" 
            DROP COLUMN IF EXISTS "customFieldsSubscriptionstatus"
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "channel" 
            DROP COLUMN IF EXISTS "customFieldsTrialendsat"
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "channel" 
            DROP COLUMN IF EXISTS "customFieldsSubscriptionstartedat"
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "channel" 
            DROP COLUMN IF EXISTS "customFieldsSubscriptionexpiresat"
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "channel" 
            DROP COLUMN IF EXISTS "customFieldsBillingcycle"
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "channel" 
            DROP COLUMN IF EXISTS "customFieldsPaystackcustomercode"
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "channel" 
            DROP COLUMN IF EXISTS "customFieldsPaystacksubscriptioncode"
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "channel" 
            DROP COLUMN IF EXISTS "customFieldsLastpaymentdate"
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "channel" 
            DROP COLUMN IF EXISTS "customFieldsLastpaymentamount"
        `, undefined);

        // Drop subscription_tier table
        await queryRunner.query(`
            DROP TABLE IF EXISTS "subscription_tier"
        `, undefined);
    }
}

