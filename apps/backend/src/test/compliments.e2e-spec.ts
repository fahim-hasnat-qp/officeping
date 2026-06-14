import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DEMO_USERS, RequestStatus, UserRole } from '@officeping/shared';
import request from 'supertest';
import { Repository } from 'typeorm';
import { Category, User } from '../entities';
import { createApp, dropSchema, runMigrations } from './helpers';

async function login(app: INestApplication, email: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/demo-login')
    .send({ email })
    .expect(200);
  return res.body.accessToken as string;
}

describe('Compliments (e2e)', () => {
  let app: INestApplication;
  let memberToken: string;
  let staffToken: string;
  let adminToken: string;
  let categoryId: string;
  let staffUserId: string;
  let completedRequestId: string;

  beforeAll(async () => {
    app = await createApp();
    await runMigrations(app);

    [memberToken, staffToken, adminToken] = await Promise.all([
      login(app, DEMO_USERS[0].email),
      login(app, DEMO_USERS[1].email),
      login(app, DEMO_USERS[2].email),
    ]);

    const users = app.get<Repository<User>>(getRepositoryToken(User));
    const staffUser = await users.findOneBy({ email: DEMO_USERS[1].email });
    staffUserId = staffUser!.id;
    staffUser!.isOnline = true;
    await users.save(staffUser!);

    const categories = app.get<Repository<Category>>(getRepositoryToken(Category));
    const cat = await categories.findOne({ where: {} });
    categoryId = cat!.id;

    // Create and complete a request so compliment can be sent
    const created = await request(app.getHttpServer())
      .post('/api/requests')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ categoryId, description: 'Compliment test request', location: 'Lobby' })
      .expect(201);
    completedRequestId = created.body.id as string;

    await request(app.getHttpServer())
      .patch(`/api/requests/${completedRequestId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: RequestStatus.ACCEPTED })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/requests/${completedRequestId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: RequestStatus.IN_PROGRESS })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/requests/${completedRequestId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: RequestStatus.DONE })
      .expect(200);
  });

  afterAll(async () => {
    await dropSchema(app);
    await app.close();
  });

  describe('POST /api/compliments', () => {
    it('member can send a compliment after a completed request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/compliments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ toStaffId: staffUserId, requestId: completedRequestId, message: 'Great service!' })
        .expect(201);

      expect(res.body).toMatchObject({
        message: 'Great service!',
        toStaff: { id: staffUserId },
      });
    });

    it('returns 409 on duplicate compliment for same request', async () => {
      await request(app.getHttpServer())
        .post('/api/compliments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ toStaffId: staffUserId, requestId: completedRequestId, message: 'Again!' })
        .expect(409);
    });

    it('returns 403 when the request is not yet DONE', async () => {
      const newReq = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ categoryId, description: 'In progress req', location: 'X' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/compliments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ toStaffId: staffUserId, requestId: newReq.body.id, message: 'Premature' })
        .expect(403);
    });

    it('returns 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/api/compliments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ message: 'Missing ids' })
        .expect(400);
    });
  });

  describe('GET /api/compliments/feed', () => {
    it('staff can access the compliments feed', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/compliments/feed')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('admin can access the compliments feed', async () => {
      await request(app.getHttpServer())
        .get('/api/compliments/feed')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('member cannot access the compliments feed', async () => {
      await request(app.getHttpServer())
        .get('/api/compliments/feed')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });

  describe('GET /api/compliments', () => {
    it('returns compliments list for authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/compliments')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
