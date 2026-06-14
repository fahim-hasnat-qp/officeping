import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDefaultBreakfastToUser1781460993248 implements MigrationInterface {
    name = 'AddDefaultBreakfastToUser1781460993248'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "request_notes" DROP CONSTRAINT "FK_request_notes_request"`);
        await queryRunner.query(`ALTER TABLE "request_notes" DROP CONSTRAINT "FK_request_notes_author"`);
        await queryRunner.query(`ALTER TABLE "requests" DROP CONSTRAINT "FK_requests_requester"`);
        await queryRunner.query(`ALTER TABLE "requests" DROP CONSTRAINT "FK_requests_staff"`);
        await queryRunner.query(`ALTER TABLE "requests" DROP CONSTRAINT "FK_requests_category"`);
        await queryRunner.query(`ALTER TABLE "breakfast" DROP CONSTRAINT "FK_breakfast_user"`);
        await queryRunner.query(`ALTER TABLE "lunch" DROP CONSTRAINT "FK_lunch_user"`);
        await queryRunner.query(`ALTER TABLE "compliments" DROP CONSTRAINT "FK_compliments_fromUser"`);
        await queryRunner.query(`ALTER TABLE "compliments" DROP CONSTRAINT "FK_compliments_toStaff"`);
        await queryRunner.query(`ALTER TABLE "compliments" DROP CONSTRAINT "FK_compliments_request"`);
        await queryRunner.query(`ALTER TABLE "push_subscriptions" DROP CONSTRAINT "FK_push_subscriptions_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_request_notes_requestId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_requests_requesterId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_requests_staffId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_requests_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_compliments_toStaffId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_push_subscriptions_userId"`);
        await queryRunner.query(`ALTER TABLE "breakfast" DROP CONSTRAINT "UQ_breakfast_userId_date"`);
        await queryRunner.query(`ALTER TABLE "lunch" DROP CONSTRAINT "UQ_lunch_userId_date"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "defaultBreakfast" character varying`);
        await queryRunner.query(`CREATE INDEX "IDX_71aa6c2af7e1de050a484fbb72" ON "request_notes" ("requestId") `);
        await queryRunner.query(`CREATE INDEX "IDX_5ebb212dcbcf18fa826ab9f75d" ON "requests" ("requesterId") `);
        await queryRunner.query(`CREATE INDEX "IDX_fe8535474fc0318278da634543" ON "requests" ("staffId") `);
        await queryRunner.query(`CREATE INDEX "IDX_59b85be6a3c16cbf27f8bdda1d" ON "requests" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_37a884120eae0b7c5c8c6ea76b" ON "compliments" ("toStaffId") `);
        await queryRunner.query(`CREATE INDEX "IDX_4cc061875e9eecc311a94b3e43" ON "push_subscriptions" ("userId") `);
        await queryRunner.query(`ALTER TABLE "breakfast" ADD CONSTRAINT "UQ_a974d30c56931a439b9e37d64c2" UNIQUE ("userId", "date")`);
        await queryRunner.query(`ALTER TABLE "lunch" ADD CONSTRAINT "UQ_9f3b26bd263065282c1e69084e6" UNIQUE ("userId", "date")`);
        await queryRunner.query(`ALTER TABLE "request_notes" ADD CONSTRAINT "FK_71aa6c2af7e1de050a484fbb728" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "request_notes" ADD CONSTRAINT "FK_460b1418bbc8d077c8e7c4e8717" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "requests" ADD CONSTRAINT "FK_5ebb212dcbcf18fa826ab9f75d3" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "requests" ADD CONSTRAINT "FK_fe8535474fc0318278da6345431" FOREIGN KEY ("staffId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "requests" ADD CONSTRAINT "FK_5a95e8393e257e96fbf0d1cae19" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "breakfast" ADD CONSTRAINT "FK_a4ca43b5b1c1ccdac584f1b4f37" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lunch" ADD CONSTRAINT "FK_5483280c16681ffde6657520429" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "compliments" ADD CONSTRAINT "FK_86d0a1d6d36ef98d92511d3d19a" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "compliments" ADD CONSTRAINT "FK_37a884120eae0b7c5c8c6ea76ba" FOREIGN KEY ("toStaffId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "compliments" ADD CONSTRAINT "FK_efed458982fafe580054a7e400d" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "push_subscriptions" ADD CONSTRAINT "FK_4cc061875e9eecc311a94b3e431" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "push_subscriptions" DROP CONSTRAINT "FK_4cc061875e9eecc311a94b3e431"`);
        await queryRunner.query(`ALTER TABLE "compliments" DROP CONSTRAINT "FK_efed458982fafe580054a7e400d"`);
        await queryRunner.query(`ALTER TABLE "compliments" DROP CONSTRAINT "FK_37a884120eae0b7c5c8c6ea76ba"`);
        await queryRunner.query(`ALTER TABLE "compliments" DROP CONSTRAINT "FK_86d0a1d6d36ef98d92511d3d19a"`);
        await queryRunner.query(`ALTER TABLE "lunch" DROP CONSTRAINT "FK_5483280c16681ffde6657520429"`);
        await queryRunner.query(`ALTER TABLE "breakfast" DROP CONSTRAINT "FK_a4ca43b5b1c1ccdac584f1b4f37"`);
        await queryRunner.query(`ALTER TABLE "requests" DROP CONSTRAINT "FK_5a95e8393e257e96fbf0d1cae19"`);
        await queryRunner.query(`ALTER TABLE "requests" DROP CONSTRAINT "FK_fe8535474fc0318278da6345431"`);
        await queryRunner.query(`ALTER TABLE "requests" DROP CONSTRAINT "FK_5ebb212dcbcf18fa826ab9f75d3"`);
        await queryRunner.query(`ALTER TABLE "request_notes" DROP CONSTRAINT "FK_460b1418bbc8d077c8e7c4e8717"`);
        await queryRunner.query(`ALTER TABLE "request_notes" DROP CONSTRAINT "FK_71aa6c2af7e1de050a484fbb728"`);
        await queryRunner.query(`ALTER TABLE "lunch" DROP CONSTRAINT "UQ_9f3b26bd263065282c1e69084e6"`);
        await queryRunner.query(`ALTER TABLE "breakfast" DROP CONSTRAINT "UQ_a974d30c56931a439b9e37d64c2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4cc061875e9eecc311a94b3e43"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_37a884120eae0b7c5c8c6ea76b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_59b85be6a3c16cbf27f8bdda1d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fe8535474fc0318278da634543"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5ebb212dcbcf18fa826ab9f75d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_71aa6c2af7e1de050a484fbb72"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "defaultBreakfast"`);
        await queryRunner.query(`ALTER TABLE "lunch" ADD CONSTRAINT "UQ_lunch_userId_date" UNIQUE ("userId", "date")`);
        await queryRunner.query(`ALTER TABLE "breakfast" ADD CONSTRAINT "UQ_breakfast_userId_date" UNIQUE ("userId", "date")`);
        await queryRunner.query(`CREATE INDEX "IDX_push_subscriptions_userId" ON "push_subscriptions" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_compliments_toStaffId" ON "compliments" ("toStaffId") `);
        await queryRunner.query(`CREATE INDEX "IDX_requests_status" ON "requests" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_requests_staffId" ON "requests" ("staffId") `);
        await queryRunner.query(`CREATE INDEX "IDX_requests_requesterId" ON "requests" ("requesterId") `);
        await queryRunner.query(`CREATE INDEX "IDX_request_notes_requestId" ON "request_notes" ("requestId") `);
        await queryRunner.query(`ALTER TABLE "push_subscriptions" ADD CONSTRAINT "FK_push_subscriptions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "compliments" ADD CONSTRAINT "FK_compliments_request" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "compliments" ADD CONSTRAINT "FK_compliments_toStaff" FOREIGN KEY ("toStaffId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "compliments" ADD CONSTRAINT "FK_compliments_fromUser" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lunch" ADD CONSTRAINT "FK_lunch_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "breakfast" ADD CONSTRAINT "FK_breakfast_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "requests" ADD CONSTRAINT "FK_requests_category" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "requests" ADD CONSTRAINT "FK_requests_staff" FOREIGN KEY ("staffId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "requests" ADD CONSTRAINT "FK_requests_requester" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "request_notes" ADD CONSTRAINT "FK_request_notes_author" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "request_notes" ADD CONSTRAINT "FK_request_notes_request" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
