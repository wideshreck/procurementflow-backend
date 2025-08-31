import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './utils/test-app';

describe('Auth & RBAC (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const userEmail = 'user.e2e@example.com';
  const adminEmail = 'admin.e2e@example.com';
  const password = 'VerySecure123!';
  const fullName = 'E2E Tester';
  const company = 'TestCorp';

  // HATA DÜZELTMESİ: Temizleme fonksiyonu
  const cleanupDatabase = async () => {
    const usersToDelete = await prisma.user.findMany({
      where: { email: { in: [userEmail, adminEmail] } },
      select: { id: true },
    });
    const userIds = usersToDelete.map((u) => u.id);

    if (userIds.length > 0) {
      await prisma.message.deleteMany({ where: { conversation: { userId: { in: userIds } } } });
      await prisma.conversation.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    // HATA DÜZELTMESİ: Test başlangıcında temizlik
    await cleanupDatabase();
  });

  afterAll(async () => {
    // HATA DÜZELTMESİ: Test sonunda temizlik
    await cleanupDatabase();
    await app.close();
  });

  it('POST /api/auth/signup → returns accessToken', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: userEmail, password, fullName, company })
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('POST /api/auth/signin → returns accessToken', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/signin')
      .send({ email: userEmail, password })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
  });

  it('POST /api/auth/signin with wrong password → 401', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/signin')
      .send({ email: userEmail, password: 'WrongPassword!' })
      .expect(401);
  });

  it('GET /api/auth/me → returns JWT payload for signed-in user', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/auth/signin')
      .send({ email: userEmail, password })
      .expect(200);

    const token = body.accessToken as string;

    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(me.body).toHaveProperty('email', userEmail);
    expect(me.body).toHaveProperty('role', 'USER');
  });

  it('GET /api/users with USER token → 403 (ADMIN only)', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/auth/signin')
      .send({ email: userEmail, password })
      .expect(200);

    const token = body.accessToken as string;

    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('Admin path: create admin user, elevate role, list users → 200', async () => {
    // 1) sign up admin
    await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: adminEmail, password, fullName, company })
      .expect(201);

    // 2) elevate to ADMIN directly via Prisma (seed-like)
    const admin = await prisma.user.update({
      where: { email: adminEmail },
      data: { role: 'ADMIN' },
    });
    expect(admin.role).toBe('ADMIN');

    // 3) sign in as admin
    const { body } = await request(app.getHttpServer())
      .post('/api/auth/signin')
      .send({ email: adminEmail, password })
      .expect(200);

    const adminToken = body.accessToken as string;

    // 4) access admin-only endpoint
    const list = await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.some((user: any) => user.email === adminEmail)).toBe(true);
    expect(list.body.some((user: any) => user.email === userEmail)).toBe(true);
  });
});
