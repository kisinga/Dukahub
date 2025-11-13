import { MigrationInterface, QueryRunner } from "typeorm";

export class FixMlTrainingFieldsConstraints1760540000002 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        // Set NOT NULL constraints for ML training fields
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'channel' AND column_name = 'customFieldsMltrainingstatus'
                ) THEN
                    ALTER TABLE "channel" ALTER COLUMN "customFieldsMltrainingstatus" SET NOT NULL;
                END IF;
            END $$;
        `, undefined);
        
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'channel' AND column_name = 'customFieldsMltrainingprogress'
                ) THEN
                    ALTER TABLE "channel" ALTER COLUMN "customFieldsMltrainingprogress" SET NOT NULL;
                END IF;
            END $$;
        `, undefined);
        
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'channel' AND column_name = 'customFieldsMlproductcount'
                ) THEN
                    ALTER TABLE "channel" ALTER COLUMN "customFieldsMlproductcount" SET NOT NULL;
                END IF;
            END $$;
        `, undefined);
        
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'channel' AND column_name = 'customFieldsMlimagecount'
                ) THEN
                    ALTER TABLE "channel" ALTER COLUMN "customFieldsMlimagecount" SET NOT NULL;
                END IF;
            END $$;
        `, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        // Remove NOT NULL constraints
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'channel' AND column_name = 'customFieldsMltrainingstatus'
                ) THEN
                    ALTER TABLE "channel" ALTER COLUMN "customFieldsMltrainingstatus" DROP NOT NULL;
                END IF;
            END $$;
        `, undefined);
        
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'channel' AND column_name = 'customFieldsMltrainingprogress'
                ) THEN
                    ALTER TABLE "channel" ALTER COLUMN "customFieldsMltrainingprogress" DROP NOT NULL;
                END IF;
            END $$;
        `, undefined);
        
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'channel' AND column_name = 'customFieldsMlproductcount'
                ) THEN
                    ALTER TABLE "channel" ALTER COLUMN "customFieldsMlproductcount" DROP NOT NULL;
                END IF;
            END $$;
        `, undefined);
        
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'channel' AND column_name = 'customFieldsMlimagecount'
                ) THEN
                    ALTER TABLE "channel" ALTER COLUMN "customFieldsMlimagecount" DROP NOT NULL;
                END IF;
            END $$;
        `, undefined);
    }
}
