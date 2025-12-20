
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- DB DIAGNOSTIC START ---');
  
  const count = await prisma.hDKnowledge.count();
  console.log(`Total Knowledge Items: ${count}`);

  const items = await prisma.hDKnowledge.findMany({
    where: {
      key: { contains: 'GENERATOR' }
    }
  });

  console.log(`Found ${items.length} items containing 'GENERATOR':`);
  items.forEach(item => {
    console.log(`ID: ${item.id}`);
    console.log(`Key: >>${item.key}<<  (Length: ${item.key.length})`);
    console.log(`Content L1 Length: ${item.contentLevel1?.length || 0}`);
    console.log('---');
  });

  console.log('--- DB DIAGNOSTIC END ---');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
