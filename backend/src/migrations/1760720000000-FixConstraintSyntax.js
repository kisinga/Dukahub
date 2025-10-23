"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixConstraintSyntax1760720000000 = void 0;
/**
 * Migration: Fix Constraint Syntax (VENDURE COMPATIBILITY)
 *
 * This migration fixes the foreign key constraint syntax to match exactly
 * what Vendure expects, resolving the schema mismatch errors.
 *
 * MIGRATION STRATEGY:
 * 1. Drop existing foreign key constraints
 * 2. Recreate them with the exact syntax Vendure expects
 * 3. No rollback support - this is a schema fix
 */
class FixConstraintSyntax1760720000000 {
  name = "FixConstraintSyntax1760720000000";

  async up(queryRunner) {
    console.log("🔄 Fixing foreign key constraint syntax...");

    // Step 1: Drop existing foreign key constraints
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

    // Step 2: Recreate constraints with exact Vendure syntax
    console.log("🔗 Recreating constraints with Vendure-compatible syntax...");

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

    console.log("✅ Foreign key constraint syntax fixed");
    console.log("📝 All constraints now match Vendure expectations");
  }

  async down(queryRunner) {
    // This migration is not reversible
    throw new Error(
      "❌ This migration is not reversible - it fixes schema compatibility"
    );
  }
}
exports.FixConstraintSyntax1760720000000 = FixConstraintSyntax1760720000000;
