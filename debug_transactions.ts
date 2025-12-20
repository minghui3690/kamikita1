
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const transactions = await prisma.transaction.findMany({
    take: 5,
    orderBy: { timestamp: 'desc' },
    include: { user: true }
  });

  console.log("=== LATEST 5 TRANSACTIONS ===");
  transactions.forEach(t => {
    console.log(`\nID: ${t.id}`);
    console.log(`User: ${t.user ? t.user.name : 'Guest'}`);
    console.log(`Status: ${t.status}`);
    console.log(`Items (Raw):`);
    try {
        const items = (typeof t.items === 'string') ? JSON.parse(t.items) : t.items;
        items.forEach((item: any, idx: number) => {
            console.log(`  Item ${idx + 1}: ${item.product.name} (ActiveDays: ${item.product.activeDays})`);
        });
    } catch (e) {
        console.log("  Error parsing items JSON:", t.items);
    }
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
