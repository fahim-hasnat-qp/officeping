import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000000000 implements MigrationInterface {
  name = 'Init1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('member', 'staff', 'admin')
    `);
    await queryRunner.query(`
      CREATE TYPE "request_status_enum" AS ENUM ('pending', 'accepted', 'in_progress', 'done', 'cancelled')
    `);
    await queryRunner.query(`
      CREATE TYPE "meal_status_enum" AS ENUM ('pending', 'confirmed', 'served')
    `);

    // users
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"         UUID NOT NULL DEFAULT uuid_generate_v4(),
        "email"      VARCHAR NOT NULL,
        "name"       VARCHAR NOT NULL,
        "googleId"   VARCHAR,
        "avatarUrl"  VARCHAR,
        "role"       "user_role_enum" NOT NULL DEFAULT 'member',
        "isOnline"   BOOLEAN NOT NULL DEFAULT false,
        "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email"     UNIQUE ("email"),
        CONSTRAINT "UQ_users_googleId"  UNIQUE ("googleId"),
        CONSTRAINT "PK_users"           PRIMARY KEY ("id")
      )
    `);

    // categories
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id"        UUID NOT NULL DEFAULT uuid_generate_v4(),
        "name"      VARCHAR NOT NULL,
        "icon"      VARCHAR NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_categories_name" UNIQUE ("name"),
        CONSTRAINT "PK_categories"      PRIMARY KEY ("id")
      )
    `);

    // requests
    await queryRunner.query(`
      CREATE TABLE "requests" (
        "id"            UUID NOT NULL DEFAULT uuid_generate_v4(),
        "requesterId"   UUID NOT NULL,
        "staffId"       UUID,
        "categoryId"    UUID NOT NULL,
        "description"   VARCHAR NOT NULL,
        "note"          VARCHAR,
        "location"      VARCHAR NOT NULL,
        "status"        "request_status_enum" NOT NULL DEFAULT 'pending',
        "cancelReason"  VARCHAR,
        "delayReason"   VARCHAR,
        "isSavedRequest" BOOLEAN NOT NULL DEFAULT false,
        "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        "acceptedAt"    TIMESTAMPTZ,
        "completedAt"   TIMESTAMPTZ,
        CONSTRAINT "PK_requests" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_requests_requesterId" ON "requests" ("requesterId")`);
    await queryRunner.query(`CREATE INDEX "IDX_requests_staffId" ON "requests" ("staffId")`);
    await queryRunner.query(`CREATE INDEX "IDX_requests_status" ON "requests" ("status")`);
    await queryRunner.query(`
      ALTER TABLE "requests"
        ADD CONSTRAINT "FK_requests_requester"
          FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE,
        ADD CONSTRAINT "FK_requests_staff"
          FOREIGN KEY ("staffId") REFERENCES "users"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "FK_requests_category"
          FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT
    `);

    // request_notes
    await queryRunner.query(`
      CREATE TABLE "request_notes" (
        "id"        UUID NOT NULL DEFAULT uuid_generate_v4(),
        "requestId" UUID NOT NULL,
        "authorId"  UUID NOT NULL,
        "message"   VARCHAR NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_request_notes" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_request_notes_requestId" ON "request_notes" ("requestId")`);
    await queryRunner.query(`
      ALTER TABLE "request_notes"
        ADD CONSTRAINT "FK_request_notes_request"
          FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE,
        ADD CONSTRAINT "FK_request_notes_author"
          FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    // breakfast
    await queryRunner.query(`
      CREATE TABLE "breakfast" (
        "id"        UUID NOT NULL DEFAULT uuid_generate_v4(),
        "userId"    UUID NOT NULL,
        "date"      DATE NOT NULL,
        "order"     VARCHAR NOT NULL,
        "status"    "meal_status_enum" NOT NULL DEFAULT 'pending',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_breakfast_userId_date" UNIQUE ("userId", "date"),
        CONSTRAINT "PK_breakfast"             PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "breakfast"
        ADD CONSTRAINT "FK_breakfast_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    // lunch
    await queryRunner.query(`
      CREATE TABLE "lunch" (
        "id"        UUID NOT NULL DEFAULT uuid_generate_v4(),
        "userId"    UUID NOT NULL,
        "date"      DATE NOT NULL,
        "attending" BOOLEAN NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_lunch_userId_date" UNIQUE ("userId", "date"),
        CONSTRAINT "PK_lunch"             PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "lunch"
        ADD CONSTRAINT "FK_lunch_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    // compliments
    await queryRunner.query(`
      CREATE TABLE "compliments" (
        "id"          UUID NOT NULL DEFAULT uuid_generate_v4(),
        "fromUserId"  UUID NOT NULL,
        "toStaffId"   UUID NOT NULL,
        "requestId"   UUID NOT NULL,
        "message"     VARCHAR NOT NULL,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_compliments_requestId" UNIQUE ("requestId"),
        CONSTRAINT "PK_compliments"           PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_compliments_toStaffId" ON "compliments" ("toStaffId")`);
    await queryRunner.query(`
      ALTER TABLE "compliments"
        ADD CONSTRAINT "FK_compliments_fromUser"
          FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE,
        ADD CONSTRAINT "FK_compliments_toStaff"
          FOREIGN KEY ("toStaffId") REFERENCES "users"("id") ON DELETE CASCADE,
        ADD CONSTRAINT "FK_compliments_request"
          FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE
    `);

    // push_subscriptions
    await queryRunner.query(`
      CREATE TABLE "push_subscriptions" (
        "id"        UUID NOT NULL DEFAULT uuid_generate_v4(),
        "userId"    UUID NOT NULL,
        "endpoint"  VARCHAR NOT NULL,
        "keys"      JSONB NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_push_subscriptions_endpoint" UNIQUE ("endpoint"),
        CONSTRAINT "PK_push_subscriptions"          PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_push_subscriptions_userId" ON "push_subscriptions" ("userId")`);
    await queryRunner.query(`
      ALTER TABLE "push_subscriptions"
        ADD CONSTRAINT "FK_push_subscriptions_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "push_subscriptions" DROP CONSTRAINT "FK_push_subscriptions_user"`);
    await queryRunner.query(`DROP INDEX "IDX_push_subscriptions_userId"`);
    await queryRunner.query(`DROP TABLE "push_subscriptions"`);

    await queryRunner.query(`ALTER TABLE "compliments" DROP CONSTRAINT "FK_compliments_request"`);
    await queryRunner.query(`ALTER TABLE "compliments" DROP CONSTRAINT "FK_compliments_toStaff"`);
    await queryRunner.query(`ALTER TABLE "compliments" DROP CONSTRAINT "FK_compliments_fromUser"`);
    await queryRunner.query(`DROP INDEX "IDX_compliments_toStaffId"`);
    await queryRunner.query(`DROP TABLE "compliments"`);

    await queryRunner.query(`ALTER TABLE "lunch" DROP CONSTRAINT "FK_lunch_user"`);
    await queryRunner.query(`DROP TABLE "lunch"`);

    await queryRunner.query(`ALTER TABLE "breakfast" DROP CONSTRAINT "FK_breakfast_user"`);
    await queryRunner.query(`DROP TABLE "breakfast"`);

    await queryRunner.query(`ALTER TABLE "request_notes" DROP CONSTRAINT "FK_request_notes_author"`);
    await queryRunner.query(`ALTER TABLE "request_notes" DROP CONSTRAINT "FK_request_notes_request"`);
    await queryRunner.query(`DROP INDEX "IDX_request_notes_requestId"`);
    await queryRunner.query(`DROP TABLE "request_notes"`);

    await queryRunner.query(`ALTER TABLE "requests" DROP CONSTRAINT "FK_requests_category"`);
    await queryRunner.query(`ALTER TABLE "requests" DROP CONSTRAINT "FK_requests_staff"`);
    await queryRunner.query(`ALTER TABLE "requests" DROP CONSTRAINT "FK_requests_requester"`);
    await queryRunner.query(`DROP INDEX "IDX_requests_status"`);
    await queryRunner.query(`DROP INDEX "IDX_requests_staffId"`);
    await queryRunner.query(`DROP INDEX "IDX_requests_requesterId"`);
    await queryRunner.query(`DROP TABLE "requests"`);

    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(`DROP TABLE "users"`);

    await queryRunner.query(`DROP TYPE "meal_status_enum"`);
    await queryRunner.query(`DROP TYPE "request_status_enum"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}
