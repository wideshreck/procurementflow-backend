import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRFxInvitations() {
  try {
    // Get all RFx documents with invitation counts
    const documents = await prisma.rFxDocument.findMany({
      include: {
        invitedSuppliers: {
          include: {
            supplier: {
              select: {
                companyName: true,
                brandName: true,
              }
            }
          }
        },
        _count: {
          select: {
            invitedSuppliers: true,
            receivedBids: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log('Recent RFx Documents:');
    documents.forEach(doc => {
      console.log(`\n${doc.documentNumber} - ${doc.title}`);
      console.log(`  Status: ${doc.status}`);
      console.log(`  Type: ${doc.type}`);
      console.log(`  Invited Suppliers: ${doc._count.invitedSuppliers}`);
      console.log(`  Received Bids: ${doc._count.receivedBids}`);
      
      if (doc.invitedSuppliers.length > 0) {
        console.log('  Invited Suppliers List:');
        doc.invitedSuppliers.forEach(inv => {
          console.log(`    - ${inv.supplier.companyName} (${inv.status}) - Invited: ${inv.invitedAt}`);
        });
      }
    });

    // Check if there are any RFxInvitation records
    const totalInvitations = await prisma.rFxInvitation.count();
    console.log(`\nTotal RFxInvitation records: ${totalInvitations}`);

    // Check latest invitations
    const latestInvitations = await prisma.rFxInvitation.findMany({
      take: 5,
      orderBy: {
        invitedAt: 'desc'
      },
      include: {
        supplier: {
          select: {
            companyName: true,
          }
        },
        rfxDocument: {
          select: {
            documentNumber: true,
            title: true,
          }
        }
      }
    });

    if (latestInvitations.length > 0) {
      console.log('\nLatest Invitations:');
      latestInvitations.forEach(inv => {
        console.log(`  - ${inv.supplier.companyName} invited to ${inv.rfxDocument.documentNumber} at ${inv.invitedAt}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRFxInvitations();