import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DEMO_USERS } from '@officeping/shared';
import request from 'supertest';
import { Repository } from 'typeorm';
import { User } from '../entities';
import { createApp, dropSchema, runMigrations } from './helpers';

async function login(app: INestApplication, email: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/demo-login')
    .send({ email })
    .expect(200);
  return res.body.accessToken as string;
}

describe('Staff (e2e)', () => {
  let app: INestApplication;
  let memberToken: string;
  let staffToken: string;

  beforeAll(async () => {
    app = await createApp();
    await runMigrations(app);
    [memberToken, staffToken] = await Promise.all([
      login(app, DEMO_USERS[0].email),
      login(app, DEMO_USERS[1].email),
    ]);
  });

  afterAll(async () => {
    await dropSchema(app);
    await app.close();
  });

  describe('PATCH /api/staff/me/status', () => {
    it('staff can set themselves online', async () => {
      await request(app.getHttpServer())
        .patch('/api/staff/me/status')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ isOnline: true })
        .expect(200);

      const users = app.get<Repository<User>>(getRepositoryToken(User));
      const user = await users.findOneBy({ email: DEMO_USERS[1].email });
      expect(user?.isOnline).toBe(true);
    });

    it('staff can set themselves offline', async () => {
      await request(app.getHttpServer())
        .patch('/api/staff/me/status')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ isOnline: false })
        .expect(200);

      const users = app.get<Repository<User>>(getRepositoryToken(User));
      const user = await users.findOneBy({ email: DEMO_USERS[1].email });
      expect(user?.isOnline).toBe(false);
    });

    it('member cannot set staff status', async () => {
      await request(app.getHttpServer())
        .patch('/api/staff/me/status')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ isOnline: true })
        .expect(403);
    });

    it('returns 400 when isOnline is missing', async () => {
      await request(app.getHttpServer())
        .patch('/api/staff/me/status')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('Push subscriptions', () => {
    it('POST /api/push/subscribe requires auth', async () => {
      await request(app.getHttpServer())
        .post('/api/push/subscribe')
        .send({ endpoint: 'https://example.com/push', keys: { auth: 'abc', p256dh: 'def' } })
        .expect(401);
    });

    it('authenticated user can subscribe to push', async () => {
      await request(app.getHttpServer())
        .post('/api/push/subscribe')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          endpoint: 'https://fcm.googleapis.com/fcm/send/fake-endpoint',
          keys: { auth: 'fakeauth', p256dh: 'fakep256dh' },
        })
        .expect(201);
    });

    it('subscribing again with same endpoint is idempotent (upsert)', async () => {
      await request(app.getHttpServer())
        .post('/api/push/subscribe')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          endpoint: 'https://fcm.googleapis.com/fcm/send/fake-endpoint',
          keys: { auth: 'fakeauth2', p256dh: 'fakep256dh2' },
        })
        .expect(201);
    });
  });
});
