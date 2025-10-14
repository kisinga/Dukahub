import {MigrationInterface, QueryRunner} from "typeorm";

export class AddMlModelCustomFields1760460059782 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsMlmodeljsonid" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsMlmodelbinid" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsMlmetadataid" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsMlmodelversion" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsMlmodelstatus" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD CONSTRAINT "FK_85d28ec02fa39e5bc688465d2f0" FOREIGN KEY ("customFieldsMlmodeljsonid") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD CONSTRAINT "FK_08fc0cec16e56ab8240784a356f" FOREIGN KEY ("customFieldsMlmodelbinid") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD CONSTRAINT "FK_94e272d93bd32e4930f534bf1f9" FOREIGN KEY ("customFieldsMlmetadataid") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "channel" DROP CONSTRAINT "FK_94e272d93bd32e4930f534bf1f9"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP CONSTRAINT "FK_08fc0cec16e56ab8240784a356f"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP CONSTRAINT "FK_85d28ec02fa39e5bc688465d2f0"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "customFieldsMlmodelstatus"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "customFieldsMlmodelversion"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "customFieldsMlmetadataid"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "customFieldsMlmodelbinid"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "customFieldsMlmodeljsonid"`, undefined);
   }

}
