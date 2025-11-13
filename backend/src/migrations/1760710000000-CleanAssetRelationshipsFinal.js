"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CleanAssetRelationshipsFinal1760710000000 = void 0;
/**
 * Migration: Clean Asset Relationships Final (FRESH SETUP COMPATIBLE)
 *
 * This is the final, clean migration for Asset relationship custom fields.
 * It handles both fresh setups and existing databases without conflicts.
 *
 * MIGRATION STRATEGY:
 * 1. Safely drop any existing problematic columns and constraints
 * 2. Create clean Asset relationship columns
 * 3. Add non-relational fields to prevent Vendure workaround columns
 * 4. Add foreign key constraints
 * 5. No rollback support - this is a breaking change
 */
class CleanAssetRelationshipsFinal1760710000000 {
  name = "CleanAssetRelationshipsFinal1760710000000";

  async up(queryRunner) {
    console.log("🔄 Clean Asset Relationships Final Migration...");

    // Step 1: Safely drop any existing problematic columns
    console.log("🗑️ Cleaning up existing columns...");

    // Channel cleanup - drop all possible variations
    await queryRunner.query(
      `ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsMlmodeljsonid"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsMlmodelbinid"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsMlmetadataid"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsCompanylogoid"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsMlModelJsonAssetId"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsMlModelBinAssetId"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsMlMetadataAssetId"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsCompanyLogoAssetId"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsMlmodeljsonassetid"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsMlmodelbinassetid"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsMlmetadataassetid"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsCompanylogoassetid"`,
      undefined
    );

    // PaymentMethod cleanup - drop all possible variations
    await queryRunner.query(
      `ALTER TABLE "payment_method" DROP COLUMN IF EXISTS "customFieldsIcon"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "payment_method" DROP COLUMN IF EXISTS "customFieldsImage"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "payment_method" DROP COLUMN IF EXISTS "customFieldsImageassetid"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "payment_method" DROP COLUMN IF EXISTS "customFieldsImageAssetId"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "payment_method" DROP COLUMN IF EXISTS "customFieldsDisplayorder"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "payment_method" DROP COLUMN IF EXISTS "customFieldsIsactive"`,
      undefined
    );

    // Step 2: Drop all existing foreign key constraints
    console.log("🗑️ Dropping existing constraints...");

    await queryRunner.query(
      `ALTER TABLE "channel" DROP CONSTRAINT IF EXISTS "FK_209b14074b96d505fce431f7841"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "channel" DROP CONSTRAINT IF EXISTS "FK_30369133482d7e7f8759cb833e5"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "channel" DROP CONSTRAINT IF EXISTS "FK_8e0c8b4ebd7bbc9eee0aeb1db25"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "channel" DROP CONSTRAINT IF EXISTS "FK_33e2e4ec9896bb0edf7bdab0cbc"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "payment_method" DROP CONSTRAINT IF EXISTS "FK_d8b49b563010113ffef086b8809"`,
      undefined
    );

    // Step 3: Create clean Asset relationship columns
    console.log("🔧 Creating Asset relationship columns...");

    // Channel Asset relationships
    await queryRunner.query(
      `ALTER TABLE "channel" ADD COLUMN IF NOT EXISTS "customFieldsMlmodeljsonassetid" integer`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "channel" ADD COLUMN IF NOT EXISTS "customFieldsMlmodelbinassetid" integer`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "channel" ADD COLUMN IF NOT EXISTS "customFieldsMlmetadataassetid" integer`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "channel" ADD COLUMN IF NOT EXISTS "customFieldsCompanylogoassetid" integer`,
      undefined
    );

    // PaymentMethod Asset relationship + non-relational field (prevents Vendure workaround)
    await queryRunner.query(
      `ALTER TABLE "payment_method" ADD COLUMN IF NOT EXISTS "customFieldsImageassetid" integer`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "payment_method" ADD COLUMN IF NOT EXISTS "customFieldsIsactive" boolean DEFAULT true`,
      undefined
    );

    // Step 4: Add foreign key constraints
    console.log("🔗 Adding foreign key constraints...");

    // Channel constraints
    await queryRunner.query(
      `
             ALTER TABLE "channel" 
             ADD CONSTRAINT "FK_209b14074b96d505fce431f7841" 
             FOREIGN KEY ("customFieldsMlmodeljsonassetid") 
             REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
         `,
      undefined
    );

    await queryRunner.query(
      `
             ALTER TABLE "channel" 
             ADD CONSTRAINT "FK_30369133482d7e7f8759cb833e5" 
             FOREIGN KEY ("customFieldsMlmodelbinassetid") 
             REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
         `,
      undefined
    );

    await queryRunner.query(
      `
             ALTER TABLE "channel" 
             ADD CONSTRAINT "FK_8e0c8b4ebd7bbc9eee0aeb1db25" 
             FOREIGN KEY ("customFieldsMlmetadataassetid") 
             REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
         `,
      undefined
    );

    await queryRunner.query(
      `
             ALTER TABLE "channel" 
             ADD CONSTRAINT "FK_33e2e4ec9896bb0edf7bdab0cbc" 
             FOREIGN KEY ("customFieldsCompanylogoassetid") 
             REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
         `,
      undefined
    );

    // PaymentMethod constraint
    await queryRunner.query(
      `
             ALTER TABLE "payment_method" 
             ADD CONSTRAINT "FK_d8b49b563010113ffef086b8809" 
             FOREIGN KEY ("customFieldsImageassetid") 
             REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
         `,
      undefined
    );

    console.log("✅ Clean Asset Relationships Final Migration Complete");
    console.log(
      "📝 All Asset relationships configured with proper non-relational fields"
    );
    console.log("🎯 Fresh setups and existing databases are now compatible");
  }

  async down(queryRunner) {
    // This migration is not reversible
    throw new Error(
      "❌ This migration is not reversible - it implements breaking changes"
    );
  }
}
exports.CleanAssetRelationshipsFinal1760710000000 =
  CleanAssetRelationshipsFinal1760710000000;
