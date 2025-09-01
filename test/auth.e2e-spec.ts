import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './utils/test-app';
import { User } from '@prisma/client';

describe('Auth & RBAC (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let user: User;
  let admin: User;
  let userToken: string;
  let adminToken: string;
  let userRefreshToken: string;

  const userEmail = 'user.e2e@example.com';
  const adminEmail = 'admin.e2e@example.com';
  const password = 'VerySecurePassword123!';
  const newPassword = 'EvenMoreSecurePassword456!';
  const fullName = 'E2E Tester';
  const company = 'TestCorp';

  const cleanupDatabase = async () => {
    const usersToDelete = await prisma.user.findMany({
      where: { email: { in: [userEmail, adminEmail] } },
      select: { id: true },
    });
    const userIds = usersToDelete.map((u) => u.id);

    if (userIds.length > 0) {
      await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.passwordReset.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.message.deleteMany({ where: { conversation: { userId: { in: userIds } } } });
      await prisma.conversation.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await cleanupDatabase();

    // Create user and admin
    const { body: userBody } = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: userEmail, password, fullName, company })
      .expect(201);
    user = userBody.user;
    userToken = userBody.tokens.accessToken;
    userRefreshToken = userBody.tokens.refreshToken;

    const { body: adminBody } = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: adminEmail, password, fullName, company })
      .expect(201);
    admin = adminBody.user;

    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: 'ADMIN' },
    });

    const { body: adminLoginBody } = await request(app.getHttpServer())
      .post('/api/auth/signin')
      .send({ email: adminEmail, password })
      .expect(200);
    adminToken = adminLoginBody.tokens.accessToken;
  });

  afterAll(async () => {
    await cleanupDatabase();
    await app.close();
  });

  describe('Authentication', () => {
    it('POST /api/auth/signup → should fail if email is already in use', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({ email: userEmail, password, fullName, company })
        .expect(409);
    });

    it('POST /api/auth/signin → should return tokens on successful login', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/signin')
        .send({ email: userEmail, password })
        .expect(200);

      expect(res.body.tokens).toHaveProperty('accessToken');
      expect(res.body.tokens).toHaveProperty('refreshToken');
    });

    it('POST /api/auth/signin → should fail with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/signin')
        .send({ email: userEmail, password: 'WrongPassword!' })
        .expect(401);
    });

    it('POST /api/auth/refresh → should return new tokens with a valid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', `refresh_token=${userRefreshToken}`)
        .expect(200);

      expect(res.body.tokens).toHaveProperty('accessToken');
      expect(res.body.tokens).toHaveProperty('refreshToken');
      expect(res.body.tokens.accessToken).not.toBe(userToken);
    });

    it('POST /api/auth/refresh → should fail with an invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', 'refresh_token=invalidtoken')
        .expect(401);
    });

    it('POST /api/auth/logout → should clear cookies and invalidate session', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('refresh_token=;');
      expect(res.headers['set-cookie'][1]).toContain('csrf_token=;');

      // Verify token is no longer valid
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401);
    });
  });

  describe('User Profile & Password Management', () => {
    let freshUserToken: string;

    beforeAll(async () => {
      // Re-login to get a fresh token
      const { body } = await request(app.getHttpServer())
        .post('/api/auth/signin')
        .send({ email: userEmail, password })
        .expect(200);
      freshUserToken = body.tokens.accessToken;
    });

    it('GET /api/auth/me → should return user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${freshUserToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('email', userEmail);
      expect(res.body).not.toHaveProperty('password');
    });

    it('PUT /api/auth/change-password → should successfully change the password', async () => {
      await request(app.getHttpServer())
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${freshUserToken}`)
        .send({ currentPassword: password, newPassword: newPassword })
        .expect(200);

      // Verify login with new password
      await request(app.getHttpServer())
        .post('/api/auth/signin')
        .send({ email: userEmail, password: newPassword })
        .expect(200);
    });

    it('PUT /api/auth/change-password → should fail with incorrect current password', async () => {
      await request(app.getHttpServer())
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${freshUserToken}`)
        .send({ currentPassword: 'wrongpassword', newPassword: 'anotherpassword' })
        .expect(401);
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('GET /api/users → should be forbidden for USER role', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('GET /api/users → should be accessible for ADMIN role', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((u: any) => u.email === adminEmail)).toBe(true);
      expect(res.body.some((u: any) => u.email === userEmail)).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('GET /api/auth/sessions → should list active sessions', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('ipAddress');
      expect(res.body[0]).toHaveProperty('userAgent');
      expect(res.body[0]).toHaveProperty('isCurrent');
    });
  });
});
