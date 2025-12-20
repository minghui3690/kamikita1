import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'c@richdragon.com'; // From screenshot

    console.log(`--- DEBUGGING DATA FOR: ${email} ---`);

    // 1. Check User
    const user = await prisma.user.findFirst({
        where: { email: email }
    });
    console.log('USER:', user ? `Found ID: ${user.id}` : 'NOT FOUND');

    // 2. Check Customer
    const customer = await prisma.customer.findFirst({
        where: { email: email }
    });
    console.log('CUSTOMER:', customer ? `Found ID: ${customer.id}` : 'NOT FOUND');

    // 3. Find Credits linked to User
    if (user) {
        const userCredits = await prisma.consultationCredit.findMany({
            where: { userId: user.id }
        });
        console.log(`CREDITS (Linked to UserID ${user.id}):`, userCredits.length);
        userCredits.forEach(c => console.log(` - Credit ID: ${c.id}, Used: ${c.usedQuota}`));
    }

    // 4. Find Credits linked to Customer
    if (customer) {
        const custCredits = await prisma.consultationCredit.findMany({
            where: { customerId: customer.id }
        });
        console.log(`CREDITS (Linked to CustomerID ${customer.id}):`, custCredits.length);
        custCredits.forEach(c => console.log(` - Credit ID: ${c.id}, Used: ${c.usedQuota}`));
    }
    
    // 5. Find ANY credits for the email (via relations) if possible?
    // Not directly possible without the Ids.
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
