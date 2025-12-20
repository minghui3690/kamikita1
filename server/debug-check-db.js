
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- DB CHECK START ---');
        const userCount = await prisma.user.count();
        console.log(`Users: ${userCount}`);
        
        const customerCount = await prisma.customer.count();
        console.log(`Customers (Total): ${customerCount}`);

        const activeCustomers = await prisma.customer.count({ where: { isArchived: false } });
        console.log(`Customers (Active): ${activeCustomers}`);

        const archivedCustomers = await prisma.customer.count({ where: { isArchived: true } });
        console.log(`Customers (Archived): ${archivedCustomers}`);
        
        console.log('--- DB CHECK END ---');
    } catch(e) {
        console.error('DB Check Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
