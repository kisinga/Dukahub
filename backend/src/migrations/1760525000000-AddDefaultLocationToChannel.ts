import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDefaultLocationToChannel1760525000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      ALTER TABLE channel_customfields 
      ADD COLUMN IF NOT EXISTS "defaultStockLocationId" character varying
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      ALTER TABLE channel_customfields 
      DROP COLUMN IF EXISTS "defaultStockLocationId"
    `);
    }
}

