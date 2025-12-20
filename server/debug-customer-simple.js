
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting...');
        const count = await prisma.customer.count();
        console.log('Total Customers:', count);
        if (count > 0) {
            const list = await prisma.customer.findMany({ 
                take: 5,
                select: { id: true, name: true, isArchived: true } 
            });
            console.log('Sample:', list);
        }
    } catch(e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
