
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking Consultation Credits & Tokens...');
    
    const credits = await prisma.consultationCredit.findMany({
        include: {
            user: { select: { name: true, email: true } },
            customer: { select: { name: true, email: true } }
        }
    });

    if (credits.length === 0) {
        console.log('❌ No Consultation Credits found in database.');
    } else {
        console.log(`✅ Found ${credits.length} credits:\n`);
        credits.forEach(c => {
            const owner = c.user?.name || c.customer?.name || 'Guest/Unknown';
            const email = c.user?.email || c.customer?.email;
            console.log(`👤 Owner: ${owner} (${email})`);
            console.log(`🏷️ Product: ${c.productName}`);
            console.log(`🔑 Token: ${c.magicToken}`);
            // Generate link with port 3000
            console.log(`🔗 Link:  http://localhost:3000/booking?token=${c.magicToken}`);
            console.log('--------------------------------------------------');
        });
    }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
