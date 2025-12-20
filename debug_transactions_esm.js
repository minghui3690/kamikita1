
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting debug script...");
  const transactions = await prisma.transaction.findMany({
    take: 5,
    orderBy: { timestamp: 'desc' },
    include: { user: true }
  });

  console.log("=== LATEST 5 TRANSACTIONS ===");
  if (transactions.length === 0) console.log("No transactions found.");
  
  transactions.forEach(t => {
    console.log(`\nID: ${t.id}`);
    console.log(`User: ${t.user ? t.user.name : (t.customerId ? 'Guest ('+t.customerId+')' : 'Unknown')}`);
    console.log(`Status: ${t.status}`);
    console.log(`Items (Raw):`);
    try {
        const items = (typeof t.items === 'string') ? JSON.parse(t.items) : t.items;
        if (Array.isArray(items)) {
            items.forEach((item, idx) => {
                const p = item.product || {};
                console.log(`  Item ${idx + 1}: ${p.name || p.nameproduct || 'Unnamed'} (ActiveDays: ${p.activeDays})`);
            });
        } else {
            console.log("  Items is not an array:", items);
        }
    } catch (e) {
        console.log("  Error parsing items JSON:", t.items);
    }
  });
}

main()
  .catch(e => {
    console.error("Script Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("Done.");
  });
