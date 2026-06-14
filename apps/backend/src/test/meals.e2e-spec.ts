import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DEMO_USERS, MealStatus } from '@officeping/shared';
import request from 'supertest';
import { Repository } from 'typeorm';
import { Breakfast } from '../entities';
import { createApp, dropSchema, runMigrations, today } from './helpers';

async function login(app: INestApplication, email: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/demo-login')
    .send({ email })
    .expect(200);
  return res.body.accessToken as string;
}

describe('Meals (e2e)', () => {
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

  describe('Breakfast', () => {
    it('member can create a breakfast order', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/meals/breakfast')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ order: 'Paratha + egg', date: today() })
        .expect(201);

      expect(res.body).toMatchObject({
        order: 'Paratha + egg',
        status: MealStatus.PENDING,
        date: today(),
      });
    });

    it('returns 409 on duplicate breakfast for same user+date', async () => {
      await request(app.getHttpServer())
        .post('/api/meals/breakfast')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ order: 'Duplicate', date: today() })
        .expect(409);
    });

    it('member can GET their own breakfast', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/meals/breakfast?date=${today()}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('staff can see all breakfast orders for the day', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/meals/breakfast?date=${today()}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('staff can advance breakfast status to confirmed', async () => {
      const breakfasts = app.get<Repository<Breakfast>>(getRepositoryToken(Breakfast));
      const row = await breakfasts.findOne({ where: { date: today() } });
      if (!row) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/meals/breakfast/${row.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: MealStatus.CONFIRMED })
        .expect(200);

      expect(res.body.status).toBe(MealStatus.CONFIRMED);
    });

    it('returns 400 when order is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/meals/breakfast')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ date: today() })
        .expect(400);
    });
  });

  describe('Lunch', () => {
    it('member can mark lunch attendance (attending=true)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/meals/lunch')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ attending: true, date: today() })
        .expect(201);

      expect(res.body.attending).toBe(true);
    });

    it('member can update lunch to not attending (upsert)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/meals/lunch')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ attending: false, date: today() })
        .expect(201);

      expect(res.body.attending).toBe(false);
    });

    it('staff can GET the lunch attendance list', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/meals/lunch?date=${today()}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('member cannot GET the lunch list', async () => {
      await request(app.getHttpServer())
        .get(`/api/meals/lunch?date=${today()}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });
});
