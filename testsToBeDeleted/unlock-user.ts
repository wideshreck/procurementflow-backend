import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function unlockUser() {
  try {
    // Find the admin user
    const user = await prisma.user.findUnique({
      where: { email: 'admin@procurementflow.com' },
    });

    if (!user) {
      console.error('User not found');
      return;
    }

    // Delete all login attempts for this user
    await prisma.loginAttempt.deleteMany({
      where: { userId: user.id },
    });

    console.log('✅ User unlocked successfully');
    console.log('Email: admin@procurementflow.com');
    console.log('Password: Admin123!');
  } catch (error) {
    console.error('Error unlocking user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

unlockUser();