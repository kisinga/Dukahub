import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditUserTrackingFields1763047440205 implements MigrationInterface {
    name = 'AddAuditUserTrackingFields1763047440205';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add Payment custom field: addedByUserId
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'payment'
                      AND column_name = 'customFieldsAddedbyuseridid'
                ) THEN
                    ALTER TABLE "payment" 
                    ADD COLUMN "customFieldsAddedbyuseridid" integer;
                END IF;
            END $$;
        `);

        // Add Order custom fields: createdByUserId and lastModifiedByUserId
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'order'
                      AND column_name = 'customFieldsCreatedbyuseridid'
                ) THEN
                    ALTER TABLE "order" 
                    ADD COLUMN "customFieldsCreatedbyuseridid" integer;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'order'
                      AND column_name = 'customFieldsLastmodifiedbyuseridid'
                ) THEN
                    ALTER TABLE "order" 
                    ADD COLUMN "customFieldsLastmodifiedbyuseridid" integer;
                END IF;
            END $$;
        `);

        // Add Customer custom field: creditApprovedByUserId
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'customer'
                      AND column_name = 'customFieldsCreditapprovedbyuseridid'
                ) THEN
                    ALTER TABLE "customer" 
                    ADD COLUMN "customFieldsCreditapprovedbyuseridid" integer;
                END IF;
            END $$;
        `);

        // Add scalar custom fields to prevent Vendure from creating workaround columns
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'order'
                      AND column_name = 'customFieldsAuditcreatedat'
                ) THEN
                    ALTER TABLE "order" 
                    ADD COLUMN "customFieldsAuditcreatedat" timestamp;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'payment'
                      AND column_name = 'customFieldsAuditcreatedat'
                ) THEN
                    ALTER TABLE "payment" 
                    ADD COLUMN "customFieldsAuditcreatedat" timestamp;
                END IF;
            END $$;
        `);

        // Drop workaround columns if they exist (from previous migration attempts)
        await queryRunner.query(`
            DO $$
            BEGIN
                BEGIN
                    ALTER TABLE "payment" 
                    DROP COLUMN IF EXISTS "customFields__fix_relational_custom_fields__";
                EXCEPTION
                    WHEN undefined_column THEN
                        NULL; -- column doesn't exist, which is fine
                END;
            END $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                BEGIN
                    ALTER TABLE "order" 
                    DROP COLUMN IF EXISTS "customFields__fix_relational_custom_fields__";
                EXCEPTION
                    WHEN undefined_column THEN
                        NULL; -- column doesn't exist, which is fine
                END;
            END $$;
        `);

        // Add foreign key constraints with guarded SQL
        // Check both constraint existence and column existence before adding
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'FK_86d295e51448490a18e441250c1'
                ) AND EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'payment'
                      AND column_name = 'customFieldsAddedbyuseridid'
                ) THEN
                    BEGIN
                        ALTER TABLE "payment"
                        ADD CONSTRAINT "FK_86d295e51448490a18e441250c1"
                        FOREIGN KEY ("customFieldsAddedbyuseridid")
                        REFERENCES "user"("id")
                        ON DELETE NO ACTION
                        ON UPDATE NO ACTION;
                    EXCEPTION
                        WHEN duplicate_object THEN
                            NULL; -- constraint already exists
                    END;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'FK_5945f0cf60c6f7a2f7ef0621c6d'
                ) AND EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'order'
                      AND column_name = 'customFieldsCreatedbyuseridid'
                ) THEN
                    BEGIN
                        ALTER TABLE "order"
                        ADD CONSTRAINT "FK_5945f0cf60c6f7a2f7ef0621c6d"
                        FOREIGN KEY ("customFieldsCreatedbyuseridid")
                        REFERENCES "user"("id")
                        ON DELETE NO ACTION
                        ON UPDATE NO ACTION;
                    EXCEPTION
                        WHEN duplicate_object THEN
                            NULL; -- constraint already exists
                    END;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'FK_9c47195914950890b0cd58a0a3b'
                ) AND EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'order'
                      AND column_name = 'customFieldsLastmodifiedbyuseridid'
                ) THEN
                    BEGIN
                        ALTER TABLE "order"
                        ADD CONSTRAINT "FK_9c47195914950890b0cd58a0a3b"
                        FOREIGN KEY ("customFieldsLastmodifiedbyuseridid")
                        REFERENCES "user"("id")
                        ON DELETE NO ACTION
                        ON UPDATE NO ACTION;
                    EXCEPTION
                        WHEN duplicate_object THEN
                            NULL; -- constraint already exists
                    END;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'FK_ab3c9edfc0a1fba97592576a7df'
                ) AND EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'customer'
                      AND column_name = 'customFieldsCreditapprovedbyuseridid'
                ) THEN
                    BEGIN
                        ALTER TABLE "customer"
                        ADD CONSTRAINT "FK_ab3c9edfc0a1fba97592576a7df"
                        FOREIGN KEY ("customFieldsCreditapprovedbyuseridid")
                        REFERENCES "user"("id")
                        ON DELETE NO ACTION
                        ON UPDATE NO ACTION;
                    EXCEPTION
                        WHEN duplicate_object THEN
                            NULL; -- constraint already exists
                    END;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(`
            DO $$
            BEGIN
                BEGIN
                    ALTER TABLE "payment" DROP CONSTRAINT IF EXISTS "FK_86d295e51448490a18e441250c1";
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
                    ALTER TABLE "order" DROP CONSTRAINT IF EXISTS "FK_5945f0cf60c6f7a2f7ef0621c6d";
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
                    ALTER TABLE "order" DROP CONSTRAINT IF EXISTS "FK_9c47195914950890b0cd58a0a3b";
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
                    ALTER TABLE "customer" DROP CONSTRAINT IF EXISTS "FK_ab3c9edfc0a1fba97592576a7df";
                EXCEPTION
                    WHEN undefined_object THEN
                        NULL;
                END;
            END $$;
        `);

        // Drop columns
        await queryRunner.query(`
            DO $$
            BEGIN
                BEGIN
                    ALTER TABLE "payment" 
                    DROP COLUMN IF EXISTS "customFieldsAddedbyuseridid";
                EXCEPTION
                    WHEN undefined_column THEN
                        NULL;
                END;
            END $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                BEGIN
                    ALTER TABLE "payment" 
                    DROP COLUMN IF EXISTS "customFieldsAuditcreatedat";
                EXCEPTION
                    WHEN undefined_column THEN
                        NULL;
                END;
            END $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                BEGIN
                    ALTER TABLE "payment" 
                    DROP COLUMN IF EXISTS "customFields__fix_relational_custom_fields__";
                EXCEPTION
                    WHEN undefined_column THEN
                        NULL;
                END;
            END $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                BEGIN
                    ALTER TABLE "order" 
                    DROP COLUMN IF EXISTS "customFieldsCreatedbyuseridid";
                EXCEPTION
                    WHEN undefined_column THEN
                        NULL;
                END;
            END $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                BEGIN
                    ALTER TABLE "order" 
                    DROP COLUMN IF EXISTS "customFieldsLastmodifiedbyuseridid";
                EXCEPTION
                    WHEN undefined_column THEN
                        NULL;
                END;
            END $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                BEGIN
                    ALTER TABLE "order" 
                    DROP COLUMN IF EXISTS "customFieldsAuditcreatedat";
                EXCEPTION
                    WHEN undefined_column THEN
                        NULL;
                END;
            END $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                BEGIN
                    ALTER TABLE "order" 
                    DROP COLUMN IF EXISTS "customFields__fix_relational_custom_fields__";
                EXCEPTION
                    WHEN undefined_column THEN
                        NULL;
                END;
            END $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                BEGIN
                    ALTER TABLE "customer" 
                    DROP COLUMN IF EXISTS "customFieldsCreditapprovedbyuseridid";
                EXCEPTION
                    WHEN undefined_column THEN
                        NULL;
                END;
            END $$;
        `);
    }
}

