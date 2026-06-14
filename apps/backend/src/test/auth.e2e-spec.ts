import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DEMO_USERS, UserRole } from '@officeping/shared';
import request from 'supertest';
import { Repository } from 'typeorm';
import { User } from '../entities';
import { createApp, dropSchema, runMigrations } from './helpers';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let users: Repository<User>;

  beforeAll(async () => {
    app = await createApp();
    await runMigrations(app);
    users = app.get<Repository<User>>(getRepositoryToken(User));
  });

  afterAll(async () => {
    await dropSchema(app);
    await app.close();
  });

  describe('POST /api/auth/demo-login', () => {
    it('returns 200 + JWT for a seeded demo member', async () => {
      const demo = DEMO_USERS[0]; // demo.member
      const res = await request(app.getHttpServer())
        .post('/api/auth/demo-login')
        .send({ email: demo.email })
        .expect(200);

      expect(res.body).toMatchObject({
        accessToken: expect.any(String),
        user: { email: demo.email, role: UserRole.MEMBER },
      });
    });

    it('returns 200 + JWT for a seeded demo staff', async () => {
      const demo = DEMO_USERS[1]; // demo.staff
      const res = await request(app.getHttpServer())
        .post('/api/auth/demo-login')
        .send({ email: demo.email })
        .expect(200);

      expect(res.body.user.role).toBe(UserRole.STAFF);
    });

    it('returns 200 + JWT for a seeded demo admin', async () => {
      const demo = DEMO_USERS[2]; // demo.admin
      const res = await request(app.getHttpServer())
        .post('/api/auth/demo-login')
        .send({ email: demo.email })
        .expect(200);

      expect(res.body.user.role).toBe(UserRole.ADMIN);
    });

    it('returns 403 for an unknown email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/demo-login')
        .send({ email: 'nobody@example.com' })
        .expect(403);
    });

    it('returns 400 when email is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/demo-login')
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/auth/google', () => {
    it('returns 401 for an invalid Google ID token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/google')
        .send({ idToken: 'not-a-real-token' })
        .expect(401);
    });

    it('returns 400 when idToken is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/google')
        .send({})
        .expect(400);
    });
  });

  describe('Protected routes', () => {
    it('returns 401 when no Bearer token is provided', async () => {
      await request(app.getHttpServer()).get('/api/requests').expect(401);
    });

    it('returns 401 for a malformed Bearer token', async () => {
      await request(app.getHttpServer())
        .get('/api/requests')
        .set('Authorization', 'Bearer garbage')
        .expect(401);
    });
  });

  describe('GET /api/health', () => {
    it('returns { status: ok } without auth', async () => {
      const res = await request(app.getHttpServer()).get('/api/health').expect(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('Provisioned admin', () => {
    it('ADMIN_EMAILS user is seeded as ADMIN on boot', async () => {
      const adminEmail = process.env.ADMIN_EMAILS?.split(',')[0]?.trim().toLowerCase();
      if (!adminEmail) return; // no admin configured in test env
      const user = await users.findOneBy({ email: adminEmail });
      expect(user?.role).toBe(UserRole.ADMIN);
    });
  });
});
