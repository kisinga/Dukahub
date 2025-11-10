import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignSubscriptionTierConstraints1761900000004 implements MigrationInterface {
    name = 'AlignSubscriptionTierConstraints1761900000004';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                BEGIN
                    ALTER TABLE "subscription_tier"
                        RENAME CONSTRAINT "UQ_subscription_tier_code" TO "UQ_f4afafa5c0e63ab4eb176ac22f8";
                EXCEPTION
                    WHEN undefined_object THEN
                        NULL;
                END;
            END $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                BEGIN
                    ALTER TABLE "channel"
                        RENAME CONSTRAINT "FK_channel_subscription_tier" TO "FK_cfa828418e58de180707fd03e1a";
                EXCEPTION
                    WHEN undefined_object THEN
                        NULL;
                END;

                BEGIN
                    ALTER TABLE "channel"
                        ADD CONSTRAINT "FK_cfa828418e58de180707fd03e1a"
                        FOREIGN KEY ("customFieldsSubscriptiontierid")
                        REFERENCES "subscription_tier"("id")
                        ON DELETE SET NULL
                        ON UPDATE NO ACTION;
                EXCEPTION
                    WHEN duplicate_object THEN
                        NULL;
                END;
            END $$;
        `);

        await queryRunner.query(`
            ALTER TABLE "subscription_tier"
                ALTER COLUMN "code" TYPE character varying;
        `);

        await queryRunner.query(`
            ALTER TABLE "subscription_tier"
                ALTER COLUMN "name" TYPE character varying;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "subscription_tier"
                ALTER COLUMN "name" TYPE character varying(255);
        `);

        await queryRunner.query(`
            ALTER TABLE "subscription_tier"
                ALTER COLUMN "code" TYPE character varying(255);
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                BEGIN
                    ALTER TABLE "channel"
                        DROP CONSTRAINT "FK_cfa828418e58de180707fd03e1a";
                EXCEPTION
                    WHEN undefined_object THEN
                        NULL;
                END;

                BEGIN
                    ALTER TABLE "channel"
                        ADD CONSTRAINT "FK_channel_subscription_tier"
                        FOREIGN KEY ("customFieldsSubscriptiontierid")
                        REFERENCES "subscription_tier"("id")
                        ON DELETE SET NULL
                        ON UPDATE NO ACTION;
                EXCEPTION
                    WHEN duplicate_object THEN
                        NULL;
                END;
            END $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                BEGIN
                    ALTER TABLE "subscription_tier"
                        RENAME CONSTRAINT "UQ_f4afafa5c0e63ab4eb176ac22f8" TO "UQ_subscription_tier_code";
                EXCEPTION
                    WHEN undefined_object THEN
                        NULL;
                END;
            END $$;
        `);
    }
}


