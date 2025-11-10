import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSubscriptionFkActions1761900000005 implements MigrationInterface {
    name = 'UpdateSubscriptionFkActions1761900000005';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                BEGIN
                    ALTER TABLE "channel" DROP CONSTRAINT "FK_channel_subscription_tier";
                EXCEPTION
                    WHEN undefined_object THEN
                        NULL;
                END;

                BEGIN
                    ALTER TABLE "channel" DROP CONSTRAINT "FK_cfa828418e58de180707fd03e1a";
                EXCEPTION
                    WHEN undefined_object THEN
                        NULL;
                END;

                ALTER TABLE "channel"
                    ADD CONSTRAINT "FK_cfa828418e58de180707fd03e1a"
                    FOREIGN KEY ("customFieldsSubscriptiontierid")
                    REFERENCES "subscription_tier"("id")
                    ON DELETE NO ACTION
                    ON UPDATE NO ACTION;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                BEGIN
                    ALTER TABLE "channel" DROP CONSTRAINT "FK_cfa828418e58de180707fd03e1a";
                EXCEPTION
                    WHEN undefined_object THEN
                        NULL;
                END;

                ALTER TABLE "channel"
                    ADD CONSTRAINT "FK_channel_subscription_tier"
                    FOREIGN KEY ("customFieldsSubscriptiontierid")
                    REFERENCES "subscription_tier"("id")
                    ON DELETE SET NULL
                    ON UPDATE NO ACTION;
            END $$;
        `);
    }
}


