import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating a new admin user...');

  const email = process.argv[2];
  const password = process.argv[3];
  const fullName = process.argv[4];
  const companyName = process.argv[5];

  if (!email || !password || !fullName || !companyName) {
    console.error('Usage: ts-node create-admin.ts <email> <password> <fullName> <companyName>');
    return;
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    console.error('User with this email already exists.');
    return;
  }

  let company = await prisma.company.findFirst({ where: { name: companyName } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: companyName,
      },
    });
    console.log(`Company "${companyName}" created.`);
  }

  const hashedPassword = await argon2.hash(password, {
    type: argon2.argon2id,
    timeCost: 2,
    memoryCost: 19456,
    parallelism: 1,
  });

  const adminPermissions = [
    'requests:create', 'requests:list', 'requests:debug',
    'cost-centers:list', 'cost-centers:create', 'cost-centers:update', 'cost-centers:delete',
    'approval-processes:edit',
    'categories:edit', 'categories:read', 'categories:create', 'categories:update', 'categories:delete',
    'auth:debug',
    'suppliers:list', 'suppliers:create', 'suppliers:update', 'suppliers:delete',
    'custom-roles:list', 'custom-roles:create', 'custom-roles:update', 'custom-roles:delete',
    'users:list', 'users:read', 'users:create', 'users:update', 'users:delete', 'users:update-role',
    'departments:read', 'departments:create', 'departments:update', 'departments:delete',
    'locations:create', 'locations:update', 'locations:delete', 'locations:read',
  ];

  let adminRole = await prisma.customRole.findFirst({
    where: { name: 'Admin', companyId: company.id },
  });

  if (adminRole) {
    adminRole = await prisma.customRole.update({
      where: { id: adminRole.id },
      data: { permissions: adminPermissions },
    });
    console.log('"Admin" custom role updated with full permissions.');
  } else {
    adminRole = await prisma.customRole.create({
      data: {
        name: 'Admin',
        companyId: company.id,
        permissions: adminPermissions,
      },
    });
    console.log('"Admin" custom role created.');
  }

  const adminUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      fullName,
      companyId: company.id,
      customRoleId: adminRole.id,
    },
  });

  console.log('Admin user created successfully:');
  console.log(adminUser);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
