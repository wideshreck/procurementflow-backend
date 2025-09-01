import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function testArgon2() {
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
      passwordLength: user.password.length,
      passwordPrefix: user.password.substring(0, 30) + '...',
    });
    
    // Test argon2 verify
    const isValid = await argon2.verify(user.password, password);
    console.log('Password valid with argon2:', isValid);
    
    // Create new hash and test
    const newHash = await argon2.hash(password);
    console.log('New hash created:', newHash.substring(0, 30) + '...');
    const testNew = await argon2.verify(newHash, password);
    console.log('New hash test:', testNew);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testArgon2();