import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateCostCenterNames() {
  try {
    // Get all cost centers with 'Tavuk Dünyası' in the name
    const costCenters = await prisma.costCenter.findMany({
      where: {
        name: {
          contains: 'Tavuk Dünyası - ',
        },
      },
    });

    console.log(`Found ${costCenters.length} cost centers to update`);

    // Update each cost center name
    for (const costCenter of costCenters) {
      const newName = costCenter.name.replace('Tavuk Dünyası - ', '');
      
      await prisma.costCenter.update({
        where: { id: costCenter.id },
        data: { name: newName },
      });
      
      console.log(`✓ Updated: ${newName}`);
    }

    console.log('\n✅ All cost center names updated successfully!');
  } catch (error) {
    console.error('Error updating cost center names:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCostCenterNames();