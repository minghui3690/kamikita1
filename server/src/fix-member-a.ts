
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('--- FIX MEMBER A START ---');

    // We know the ID of member A from previous run: 329be407-6517-4a33-93b1-8b335c9a5832
    // But to be safe, let's find by "contains" email
    
    const users = await prisma.user.findMany({
        where: {
            email: {
                contains: 'ab@richdragon.com'
            }
        }
    });

    const targetUser = users.find(u => u.email.includes('ab@richdragon.com'));

    if (!targetUser) {
        console.log('User not found by fuzzy search.');
        return;
    }

    console.log(`Found user: ID=${targetUser.id}`);
    console.log(`Current Email: >>${targetUser.email}<<`);

    const cleanEmail = 'ab@richdragon.com';
    const newPassword = await bcrypt.hash('admin123', 10);

    // Update
    await prisma.user.update({
        where: { id: targetUser.id },
        data: {
            email: cleanEmail,
            password: newPassword
        }
    });

    console.log(`Updated user ${targetUser.id}:`);
    console.log(` - Email set to: '${cleanEmail}'`);
    console.log(` - Password reset to: 'admin123'`);

    console.log('--- FIX MEMBER A END ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
