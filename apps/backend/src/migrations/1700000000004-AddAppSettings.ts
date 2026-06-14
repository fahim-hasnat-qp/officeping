import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppSettings1700000000004 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "app_settings" (
        "key"       varchar NOT NULL PRIMARY KEY,
        "value"     varchar NOT NULL,
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await qr.query(`
      INSERT INTO "app_settings" ("key", "value") VALUES
        ('breakfast_cutoff', '08:30'),
        ('lunch_cutoff', '11:00')
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "app_settings"`);
  }
}
