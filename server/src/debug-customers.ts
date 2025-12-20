
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.customer.count();
        console.log(`Total Customers in DB: ${count}`);

        const customers = await prisma.customer.findMany({
            take: 5,
            select: { id: true, name: true, email: true, isArchived: true }
        });
        console.log('Sample Customers:', customers);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
