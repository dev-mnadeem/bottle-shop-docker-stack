import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The whole schema in one migration: three tables, the uniqueness that the
 * application relies on for idempotency, and the two indexes that back the
 * catalogue's ORDER BY and price filter.
 */
export class InitialSchema1706000000000 implements MigrationInterface {
  name = 'InitialSchema1706000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar(320) NOT NULL,
        "passwordHash" text NOT NULL,
        "role" varchar(20) NOT NULL DEFAULT 'user',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_user_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "slug" varchar(255) NOT NULL,
        "name" varchar(200) NOT NULL,
        "priceCents" integer NOT NULL,
        "imageUrl" text NOT NULL,
        "shortDescription" varchar(400) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_product_slug" UNIQUE ("slug"),
        CONSTRAINT "ck_product_price_non_negative" CHECK ("priceCents" >= 0)
      )
    `);

    // Matches "ORDER BY createdAt DESC, id DESC" exactly, so the catalogue page
    // is an index scan rather than a sort of the whole table.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_product_created_id" ON "product" ("createdAt", "id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_product_price" ON "product" ("priceCents")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lead" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar(320) NOT NULL,
        "name" varchar(120) NOT NULL,
        "message" text NOT NULL,
        "utmSource" varchar(120),
        "intent" varchar(32) NOT NULL DEFAULT 'general',
        "priority" varchar(16) NOT NULL DEFAULT 'normal',
        "triageSource" varchar(32) NOT NULL DEFAULT 'rules',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_lead_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_lead_created_at" ON "lead" ("createdAt")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "lead"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user"`);
  }
}
