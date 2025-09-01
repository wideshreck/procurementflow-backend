import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    const newPassword = 'Admin123!';
    const hashedPassword = await argon2.hash(newPassword);
    
    // Update the admin user's password
    const user = await prisma.user.update({
      where: { email: 'admin@procurementflow.com' },
      data: { 
        password: hashedPassword,
        emailVerified: true,
        isActive: true,
      },
    });

    console.log('✅ Password reset successfully');
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    console.log('Password:', newPassword);
    console.log('Email Verified:', user.emailVerified);
    console.log('Is Active:', user.isActive);
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();