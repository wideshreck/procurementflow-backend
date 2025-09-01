import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as Papa from 'papaparse';
import * as path from 'path';

const prisma = new PrismaClient();

async function importCostCenters() {
  try {
    // Read CSV file
    const csvPath = path.join(__dirname, '..', 'tavuk_dunyasi_cost_centers.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const { data, errors } = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });
    
    if (errors.length > 0) {
      console.error('CSV parsing errors:', errors);
      return;
    }
    
    console.log(`Found ${data.length} cost centers to import`);
    
    // Get admin user and company
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@procurementflow.com' },
    });
    
    if (!adminUser) {
      console.error('Admin user not found');
      return;
    }
    
    // Import each cost center
    for (const row of data as any[]) {
      try {
        // Find department
        const department = await prisma.department.findFirst({
          where: {
            name: row.departmentName,
            companyId: adminUser.companyId,
          },
        });
        
        if (!department) {
          console.warn(`Department not found: ${row.departmentName}`);
          continue;
        }
        
        // Find budget owner
        const budgetOwner = await prisma.user.findUnique({
          where: { email: row.budgetOwnerEmail },
        });
        
        if (!budgetOwner) {
          console.warn(`Budget owner not found: ${row.budgetOwnerEmail}`);
          continue;
        }
        
        // Create cost center
        const budget = parseFloat(row.budget);
        const costCenter = await prisma.costCenter.create({
          data: {
            name: row.name,
            description: row.description,
            budget: budget,
            remainingBudget: budget, // Initially, remaining budget equals total budget
            spentBudget: 0, // Initially, no budget is spent
            budgetOwnerId: budgetOwner.id,
            departmentId: department.id,
            companyId: adminUser.companyId,
          },
        });
        
        console.log(`✓ Created cost center: ${costCenter.name}`);
      } catch (error) {
        console.error(`Error creating cost center ${row.name}:`, error.message);
      }
    }
    
    console.log('\\n✅ Cost centers imported successfully!');
  } catch (error) {
    console.error('Error importing cost centers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importCostCenters();