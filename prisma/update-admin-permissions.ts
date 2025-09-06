import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAdminPermissions() {
  try {
    // Find the admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        email: 'admin@procurementflow.com',
      },
      include: {
        customRole: true,
      },
    });

    if (!adminUser) {
      console.error('Admin user not found');
      return;
    }

    if (!adminUser.customRole) {
      // Create Admin role if it doesn't exist
      const adminRole = await prisma.customRole.create({
        data: {
          name: 'Admin',
          description: 'Full system administrator with all permissions',
          companyId: adminUser.companyId!,
          permissions: ['*'], // Wildcard for all permissions
        },
      });

      // Update user to use this role
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { customRoleId: adminRole.id },
      });

      console.log('Created and assigned Admin role with full permissions');
    } else {
      // Update existing role to include all permissions
      const updatedRole = await prisma.customRole.update({
        where: { id: adminUser.customRole.id },
        data: {
          permissions: ['*'], // Wildcard for all permissions including RFx routes
        },
      });

      console.log(`Updated ${updatedRole.name} role with full permissions`);
    }

    // Verify the update
    const verifiedUser = await prisma.user.findFirst({
      where: {
        email: 'admin@procurementflow.com',
      },
      include: {
        customRole: true,
      },
    });

    console.log('Admin user permissions updated successfully');
    console.log('Role:', verifiedUser?.customRole?.name);
    console.log('Permissions:', verifiedUser?.customRole?.permissions);

  } catch (error) {
    console.error('Error updating admin permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateAdminPermissions();