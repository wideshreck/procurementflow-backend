import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  console.log('Creating a new admin user...');

  const email = await new Promise<string>((resolve) => {
    rl.question('Enter admin email: ', (answer) => resolve(answer));
  });

  const password = await new Promise<string>((resolve) => {
    rl.question('Enter admin password: ', (answer) => resolve(answer));
  });

  const fullName = await new Promise<string>((resolve) => {
    rl.question('Enter admin full name: ', (answer) => resolve(answer));
  });

  const companyName = await new Promise<string>((resolve) => {
    rl.question('Enter company name: ', (answer) => resolve(answer));
  });

  rl.close();

  if (!email || !password || !fullName || !companyName) {
    console.error('Email, password, full name, and company name are required.');
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

  const adminUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      fullName,
      companyId: company.id,
      role: 'ADMIN',
      emailVerified: true,
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
