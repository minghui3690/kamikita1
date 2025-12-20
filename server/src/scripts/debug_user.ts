import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const username = 'c3657'; 
    console.log(`--- DEBUGGING DATA FOR USERNAME: ${username} ---`);

    // 1. Get User
    const user = await prisma.user.findFirst({
        where: { username: username }
    });

    if (!user) {
        console.log('User NOT FOUND with username:', username);
        return;
    }

    console.log(`FOUND USER:`);
    console.log(` - ID: ${user.id}`);
    console.log(` - Email: ${user.email}`);
    console.log(` - Name: ${user.name}`);

    // 2. Check Credits by UserID
    const creditsById = await prisma.consultationCredit.findMany({
        where: { userId: user.id }
    });
    console.log(`CREDITS LINKED TO USER ID (${creditsById.length}):`);
    creditsById.forEach(c => console.log(` - CreditID: ${c.id}, Product: ${c.productName}`));

    // 3. Check Customer by Email
    const customer = await prisma.customer.findFirst({
        where: { email: user.email }
    });
    console.log(`CUSTOMER RECORD (${customer ? 'FOUND' : 'NONE'}):`, customer ? customer.id : '');

    if (customer) {
        const creditsByCust = await prisma.consultationCredit.findMany({
            where: { customerId: customer.id }
        });
        console.log(`CREDITS LINKED TO CUSTOMER ID (${creditsByCust.length}):`);
        creditsByCust.forEach(c => console.log(` - CreditID: ${c.id}`));
    }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
