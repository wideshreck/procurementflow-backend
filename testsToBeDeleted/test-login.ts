import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function testLogin() {
  try {
    const email = 'admin@procurementflow.com';
    const password = 'Admin123!';
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user) {
      console.error('User not found');
      return;
    }
    
    console.log('User found:', {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      passwordLength: user.password.length,
    });
    
    // Test password
    const isValid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isValid);
    
    // Test with a new hash
    const newHash = await bcrypt.hash(password, 10);
    const testNew = await bcrypt.compare(password, newHash);
    console.log('New hash test:', testNew);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();