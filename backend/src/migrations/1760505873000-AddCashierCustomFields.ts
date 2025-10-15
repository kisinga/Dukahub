import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCashierCustomFields1760505873000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsCashierflowenabled" boolean`, undefined);
        await queryRunner.query(`ALTER TABLE "stock_location" ADD "customFieldsCashieropen" boolean`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "stock_location" DROP COLUMN "customFieldsCashieropen"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "customFieldsCashierflowenabled"`, undefined);
    }

}

