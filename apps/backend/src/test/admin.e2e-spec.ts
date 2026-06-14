import { INestApplication } from '@nestjs/common';
import { DEMO_USERS, UserRole } from '@officeping/shared';
import request from 'supertest';
import { createApp, dropSchema, runMigrations } from './helpers';

async function login(app: INestApplication, email: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/demo-login')
    .send({ email })
    .expect(200);
  return res.body.accessToken as string;
}

describe('Admin (e2e)', () => {
  let app: INestApplication;
  let memberToken: string;
  let staffToken: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await createApp();
    await runMigrations(app);

    [memberToken, staffToken, adminToken] = await Promise.all([
      login(app, DEMO_USERS[0].email),
      login(app, DEMO_USERS[1].email),
      login(app, DEMO_USERS[2].email),
    ]);
  });

  afterAll(async () => {
    await dropSchema(app);
    await app.close();
  });

  describe('Role enforcement', () => {
    const adminOnlyPaths = [
      '/api/admin/stats',
      '/api/admin/stats/by-category',
      '/api/admin/staff-performance',
      '/api/admin/users',
    ];

    for (const path of adminOnlyPaths) {
      it(`GET ${path} → 403 for member`, async () => {
        await request(app.getHttpServer())
          .get(path)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(403);
      });

      it(`GET ${path} → 403 for staff`, async () => {
        await request(app.getHttpServer())
          .get(path)
          .set('Authorization', `Bearer ${staffToken}`)
          .expect(403);
      });
    }
  });

  describe('GET /api/admin/categories (public)', () => {
    it('returns categories without auth', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/categories')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toMatchObject({ id: expect.any(String), name: expect.any(String), icon: expect.any(String) });
    });
  });

  describe('GET /api/admin/stats', () => {
    it('returns stats for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        totalRequests: expect.any(Number),
        completionRate: expect.any(Number),
        totalCompliments: expect.any(Number),
      });
    });
  });

  describe('GET /api/admin/staff-performance', () => {
    it('returns staff performance list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/staff-performance')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/admin/users (Add person)', () => {
    it('admin can pre-provision a non-domain user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'newstaff@gmail.com', name: 'New Staff', role: UserRole.STAFF })
        .expect(201);

      expect(res.body).toMatchObject({
        email: 'newstaff@gmail.com',
        role: UserRole.STAFF,
      });
      expect(res.body.googleId).toBeNull();
    });

    it('returns 409 on duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'newstaff@gmail.com', name: 'Dup', role: UserRole.STAFF })
        .expect(409);
    });

    it('returns 403 for staff', async () => {
      await request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ email: 'blocked@gmail.com', name: 'Blocked', role: UserRole.MEMBER })
        .expect(403);
    });
  });

  describe('PATCH /api/admin/users/:id', () => {
    it('admin can change a user role', async () => {
      const usersRes = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const member = (usersRes.body as Array<{ id: string; role: string }>).find(
        (u) => u.role === UserRole.MEMBER,
      );
      if (!member) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/admin/users/${member.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.STAFF })
        .expect(200);

      expect(res.body.role).toBe(UserRole.STAFF);
    });
  });

  describe('Categories CRUD', () => {
    let categoryId: string;

    it('admin can create a category', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Category', icon: '🧪' })
        .expect(201);

      expect(res.body).toMatchObject({ name: 'Test Category', icon: '🧪' });
      categoryId = res.body.id as string;
    });

    it('admin can update a category', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Category' })
        .expect(200);

      expect(res.body.name).toBe('Updated Category');
    });

    it('member cannot create a category', async () => {
      await request(app.getHttpServer())
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Blocked', icon: '❌' })
        .expect(403);
    });
  });
});
