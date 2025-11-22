import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedKenyaContext9000000000001 implements MigrationInterface {
  name = 'SeedKenyaContext9000000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        required_tables text[] := ARRAY[
          'country',
          'zone',
          'zone_members_country',
          'tax_category',
          'tax_rate',
          'channel'
        ];
        missing_tables text[];
        ke_country_id int;
        kenya_zone_id int;
        tax_category_id int;
        tax_rate_id int;
        default_channel_id int;
      BEGIN
        SELECT ARRAY(
          SELECT table_name
          FROM unnest(required_tables) AS t(table_name)
          WHERE NOT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = current_schema()
              AND table_name = t.table_name
          )
        ) INTO missing_tables;

        IF missing_tables IS NOT NULL AND array_length(missing_tables, 1) > 0 THEN
          RAISE NOTICE 'Skipping Kenya seed migration - missing core tables: %',
            array_to_string(missing_tables, ', ');
        ELSE
          -- 1. Ensure Country 'KE' (Kenya) exists
          IF NOT EXISTS (SELECT 1 FROM "country" WHERE "code" = 'KE') THEN
              INSERT INTO "country" ("createdAt", "updatedAt", "code", "enabled", "name")
              VALUES (NOW(), NOW(), 'KE', true, 'Kenya')
              RETURNING id INTO ke_country_id;
          ELSE
              SELECT id INTO ke_country_id FROM "country" WHERE "code" = 'KE';
          END IF;

          -- 2. Ensure Zone 'Kenya' exists
          IF NOT EXISTS (SELECT 1 FROM "zone" WHERE "name" = 'Kenya') THEN
              INSERT INTO "zone" ("createdAt", "updatedAt", "name", "enabled")
              VALUES (NOW(), NOW(), 'Kenya', true)
              RETURNING id INTO kenya_zone_id;
          ELSE
              SELECT id INTO kenya_zone_id FROM "zone" WHERE "name" = 'Kenya';
          END IF;

          -- 3. Ensure Country Kenya is in Zone Kenya
          IF NOT EXISTS (SELECT 1 FROM "zone_members_country" WHERE "zoneId" = kenya_zone_id AND "countryId" = ke_country_id) THEN
              INSERT INTO "zone_members_country" ("zoneId", "countryId")
              VALUES (kenya_zone_id, ke_country_id);
          END IF;

          -- 4. Ensure Tax Category 'Standard Tax' exists
          IF NOT EXISTS (SELECT 1 FROM "tax_category" WHERE "name" = 'Standard Tax') THEN
              INSERT INTO "tax_category" ("createdAt", "updatedAt", "name", "isDefault")
              VALUES (NOW(), NOW(), 'Standard Tax', true)
              RETURNING id INTO tax_category_id;
          ELSE
              SELECT id INTO tax_category_id FROM "tax_category" WHERE "name" = 'Standard Tax';
          END IF;

          -- 5. Ensure Tax Rate 'Kenya VAT' (16%) exists for Kenya Zone
          IF NOT EXISTS (SELECT 1 FROM "tax_rate" WHERE "name" = 'Kenya VAT' AND "zoneId" = kenya_zone_id) THEN
              INSERT INTO "tax_rate" ("createdAt", "updatedAt", "name", "enabled", "value", "categoryId", "zoneId")
              VALUES (NOW(), NOW(), 'Kenya VAT', true, 16.00, tax_category_id, kenya_zone_id)
              RETURNING id INTO tax_rate_id;
          ELSE
              SELECT id INTO tax_rate_id FROM "tax_rate" WHERE "name" = 'Kenya VAT' AND "zoneId" = kenya_zone_id;
          END IF;

          -- 6. Update Default Channel
          SELECT id INTO default_channel_id FROM "channel" WHERE "code" = '__default_channel__';
          IF default_channel_id IS NULL THEN
              SELECT id INTO default_channel_id FROM "channel" ORDER BY id ASC LIMIT 1;
          END IF;

          IF default_channel_id IS NOT NULL THEN
              UPDATE "channel"
              SET "defaultShippingZoneId" = kenya_zone_id,
                  "defaultTaxZoneId" = kenya_zone_id,
                  "defaultCurrencyCode" = 'KES',
                  "currencyCode" = 'KES'
              WHERE id = default_channel_id;
          END IF;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No revert - this establishes baseline state
  }
}
