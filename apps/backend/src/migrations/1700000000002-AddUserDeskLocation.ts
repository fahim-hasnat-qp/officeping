import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserDeskLocation1700000000002 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deskLocation" varchar DEFAULT NULL`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "deskLocation"`);
  }
}
