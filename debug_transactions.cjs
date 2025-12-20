
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
      console.log("Starting CJS debug script...");
      
      // 1. Check KAKA Products
      const products = await prisma.product.findMany({
          where: { 
             OR: [
                 { name: { contains: 'KAKA' } },
                 { nameproduct: { contains: 'KAKA' } },
                 { name: { contains: 'Konsultasi' } }
             ]
          }
      });
      console.log("\n=== RELEVANT PRODUCTS ===");
      products.forEach(p => {
          console.log(`[${p.id}] ${p.name} / ${p.nameproduct}: ActiveDays = ${p.activeDays}`);
      });

      // 2. Check Transactions
      const transactions = await prisma.transaction.findMany({
        take: 5,
        orderBy: { timestamp: 'desc' },
        include: { user: true }
      });

      console.log("\n=== LATEST 5 TRANSACTIONS ===");
      if (transactions.length === 0) console.log("No transactions found.");
      
      transactions.forEach(t => {
        console.log(`\nID: ${t.id}`);
        console.log(`User: ${t.user ? t.user.name : (t.customerId ? 'Guest id '+t.customerId : 'Unknown')}`);
        console.log(`Status: ${t.status}`);
        let items = [];
        try {
            items = (typeof t.items === 'string') ? JSON.parse(t.items) : t.items;
        } catch(e) { console.log("  JSON Parse Error"); }
        
        if (Array.isArray(items)) {
            items.forEach((item, idx) => {
                const p = item.product || {};
                console.log(`  Item ${idx + 1}: ${p.name || p.nameproduct} | ActiveDays In Snapshot: ${p.activeDays}`);
            });
        }
      });

  } catch (e) {
      console.error(e);
  } finally {
      await prisma.$disconnect();
  }
}

main();
