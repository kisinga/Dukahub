import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationEntity1761700000000 implements MigrationInterface {
    name = 'AddNotificationEntity1761700000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if the enum type already exists
        const enumExists = await queryRunner.query(`
            SELECT 1 FROM pg_type WHERE typname = 'notification_type_enum'
        `);

        // Create the notification_type_enum only if it doesn't exist
        if (enumExists.length === 0) {
            await queryRunner.query(`
                CREATE TYPE "public"."notification_type_enum" AS ENUM('order', 'stock', 'ml_training', 'payment')
            `);
        }

        // Check if the notification table already exists
        const tableExists = await queryRunner.query(`
            SELECT 1 FROM information_schema.tables WHERE table_name = 'notification'
        `);

        // Create the notification table only if it doesn't exist
        if (tableExists.length === 0) {
            await queryRunner.query(`
                CREATE TABLE "notification" (
                    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                    "userId" character varying NOT NULL,
                    "channelId" character varying NOT NULL,
                    "type" "public"."notification_type_enum" NOT NULL,
                    "title" character varying NOT NULL,
                    "message" character varying NOT NULL,
                    "data" jsonb,
                    "read" boolean NOT NULL DEFAULT false,
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_705b6c7cdf9b2c2ff7ac7872cb7" PRIMARY KEY ("id")
                )
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the notification table if it exists
        await queryRunner.query(`DROP TABLE IF EXISTS "notification"`);

        // Drop the notification_type_enum if it exists
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."notification_type_enum"`);
    }
}
