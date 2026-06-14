import { MigrationInterface, QueryRunner } from 'typeorm';
import { DEFAULT_CATEGORIES } from '@officeping/shared';

export class InsertDefaultCategories1700000000001 implements MigrationInterface {
  name = 'InsertDefaultCategories1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const cat of DEFAULT_CATEGORIES) {
      await queryRunner.query(
        `INSERT INTO "categories" ("name", "icon") VALUES ($1, $2) ON CONFLICT ("name") DO NOTHING`,
        [cat.name, cat.icon],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const cat of DEFAULT_CATEGORIES) {
      await queryRunner.query(`DELETE FROM "categories" WHERE "name" = $1`, [cat.name]);
    }
  }
}
