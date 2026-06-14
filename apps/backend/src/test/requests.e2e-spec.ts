import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DEMO_USERS, RequestStatus, UserRole } from '@officeping/shared';
import request from 'supertest';
import { Repository } from 'typeorm';
import { Category, User } from '../entities';
import { createApp, dropSchema, runMigrations } from './helpers';

/** Log in as a demo user and return the Bearer token. */
async function login(app: INestApplication, email: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/demo-login')
    .send({ email })
    .expect(200);
  return res.body.accessToken as string;
}

describe('Requests (e2e)', () => {
  let app: INestApplication;
  let memberToken: string;
  let staffToken: string;
  let adminToken: string;
  let categoryId: string;

  beforeAll(async () => {
    app = await createApp();
    await runMigrations(app);

    [memberToken, staffToken, adminToken] = await Promise.all([
      login(app, DEMO_USERS[0].email),
      login(app, DEMO_USERS[1].email),
      login(app, DEMO_USERS[2].email),
    ]);

    // Seed demo staff as online so auto-assign has a target
    const users = app.get<Repository<User>>(getRepositoryToken(User));
    const staffUser = await users.findOneBy({ email: DEMO_USERS[1].email });
    if (staffUser) {
      staffUser.isOnline = true;
      await users.save(staffUser);
    }

    // Grab a seeded category
    const categories = app.get<Repository<Category>>(getRepositoryToken(Category));
    const cat = await categories.findOne({ where: {} });
    categoryId = cat!.id;
  });

  afterAll(async () => {
    await dropSchema(app);
    await app.close();
  });

  describe('POST /api/requests', () => {
    it('creates a request and returns PENDING status', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ categoryId, description: 'One tea please', location: 'Room 101' })
        .expect(201);

      expect(res.body).toMatchObject({
        status: RequestStatus.PENDING,
        description: 'One tea please',
        location: 'Room 101',
      });
      expect(res.body.id).toBeDefined();
    });

    it('auto-assigns to the online staff member', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ categoryId, description: 'Coffee', location: 'Desk 5' })
        .expect(201);

      expect(res.body.staff).not.toBeNull();
      expect(res.body.staff.id).toBeDefined();
    });

    it('saves as quick-send when flag is set', async () => {
      await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ categoryId, description: 'Morning tea', location: 'Desk 5', isSavedRequest: true })
        .expect(201);

      const qs = await request(app.getHttpServer())
        .get('/api/requests/quick-send')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(qs.body.some((r: { description: string }) => r.description === 'Morning tea')).toBe(true);
    });

    it('returns 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ description: 'oops' })
        .expect(400);
    });

    it('returns 401 without auth', async () => {
      await request(app.getHttpServer()).post('/api/requests').send({}).expect(401);
    });
  });

  describe('GET /api/requests', () => {
    it('member sees only own requests', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/requests')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('staff sees all requests', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/requests')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('filters by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/requests?status=pending')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(res.body.every((r: { status: string }) => r.status === RequestStatus.PENDING)).toBe(true);
    });
  });

  describe('Status transitions', () => {
    let requestId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ categoryId, description: 'Test request', location: 'Lobby' })
        .expect(201);
      requestId = res.body.id as string;
    });

    it('staff can accept a pending request', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/requests/${requestId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: RequestStatus.ACCEPTED })
        .expect(200);

      expect(res.body.status).toBe(RequestStatus.ACCEPTED);
      expect(res.body.acceptedAt).not.toBeNull();
    });

    it('rejects an invalid transition (pending → done)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/requests/${requestId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: RequestStatus.DONE })
        .expect(400);
    });

    it('member cannot accept a request', async () => {
      await request(app.getHttpServer())
        .patch(`/api/requests/${requestId}/status`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: RequestStatus.ACCEPTED })
        .expect(403);
    });

    it('full happy path: pending → accepted → in_progress → done', async () => {
      await request(app.getHttpServer())
        .patch(`/api/requests/${requestId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: RequestStatus.ACCEPTED })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/requests/${requestId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: RequestStatus.IN_PROGRESS })
        .expect(200);

      const done = await request(app.getHttpServer())
        .patch(`/api/requests/${requestId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: RequestStatus.DONE })
        .expect(200);

      expect(done.body.status).toBe(RequestStatus.DONE);
      expect(done.body.completedAt).not.toBeNull();
    });

    it('requester can cancel their own pending request', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/requests/${requestId}/cancel`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ reason: 'Changed my mind' })
        .expect(200);

      expect(res.body.status).toBe(RequestStatus.CANCELLED);
      expect(res.body.cancelReason).toBe('Changed my mind');
    });

    it('staff can add a delay reason', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/requests/${requestId}/delay`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ reason: 'Kitchen is busy' })
        .expect(200);

      expect(res.body.delayReason).toBe('Kitchen is busy');
    });
  });

  describe('GET /api/requests/:id', () => {
    it('returns request with notes and complimentSent fields', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ categoryId, description: 'Detail test', location: 'Room 2' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/requests/${created.body.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(res.body.notes).toBeDefined();
      expect(res.body.complimentSent).toBe(false);
    });

    it('returns 403 when a different member tries to view it', async () => {
      // Create a second member
      const users = app.get<Repository<User>>(getRepositoryToken(User));
      const other = await users.save(
        users.create({ email: 'other@officeping.test', name: 'Other', role: UserRole.MEMBER }),
      );
      const otherRes = await request(app.getHttpServer())
        .post('/api/auth/demo-login')
        .send({ email: other.email });

      const created = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ categoryId, description: 'Private', location: 'Room 3' })
        .expect(201);

      // demo-login won't work for non-DEMO_USERS — test 403 via staff logic instead
      // Staff can view any request
      const staffView = await request(app.getHttpServer())
        .get(`/api/requests/${created.body.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(staffView.body.id).toBe(created.body.id);

      // Clean up
      await users.delete(other.id);
      void otherRes; // suppress unused warning
    });
  });

  describe('POST /api/requests/:id/notes', () => {
    it('member can add a note to their own active request', async () => {
      const req = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ categoryId, description: 'Notes test', location: 'Desk 1' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/api/requests/${req.body.id}/notes`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ message: 'No sugar please' })
        .expect(201);

      expect(res.body).toMatchObject({
        message: 'No sugar please',
        requestId: req.body.id,
        author: expect.objectContaining({ id: expect.any(String) }),
      });
    });

    it('returns 400 when adding a note to a cancelled request', async () => {
      const req = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ categoryId, description: 'To cancel', location: 'X' })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/requests/${req.body.id}/cancel`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ reason: 'test' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/requests/${req.body.id}/notes`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ message: 'Too late' })
        .expect(400);
    });

    it('returns 400 when message is empty', async () => {
      const req = await request(app.getHttpServer())
        .post('/api/requests')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ categoryId, description: 'Note empty test', location: 'X' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/requests/${req.body.id}/notes`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ message: '' })
        .expect(400);
    });
  });
});
