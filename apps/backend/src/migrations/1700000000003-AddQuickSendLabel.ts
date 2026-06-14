import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuickSendLabel1700000000003 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE "requests" ADD COLUMN IF NOT EXISTS "quickSendLabel" varchar DEFAULT NULL`,
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE "requests" DROP COLUMN IF EXISTS "quickSendLabel"`);
  }
}
