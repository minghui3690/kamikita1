
import 'dotenv/config'; // Explicitly load .env
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('--- USER DIAGNOSTIC V2 START ---');
    
    // Log DATABASE_URL (partial) to verify connection target
    const dbUrl = process.env.DATABASE_URL || 'UNDEFINED';
    console.log(`DATABASE_URL: ${dbUrl.replace(/:[^:]*@/, ':****@')}`); // Mask password

    // List all users to see what's in the DB we are connected to
    const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true, isActive: true }
    });
    console.log(`Total Users Found: ${users.length}`);
    users.forEach(u => console.log(` - [${u.role}] ${u.email} (Active: ${u.isActive}) ID:${u.id}`));

    // Check specific user
    const targetEmail = 'ab@richdragon.com';
    const targetUser = await prisma.user.findUnique({ where: { email: targetEmail } });

    if (targetUser) {
        console.log(`\nFound target user: ${targetEmail}`);
        const passwordToCheck = 'admin123';
        const isMatch = await bcrypt.compare(passwordToCheck, targetUser.password);
        console.log(`Password 'admin123' match: ${isMatch}`);

        if (!isMatch) {
            console.log('Resetting password to admin123...');
            const newHash = await bcrypt.hash(passwordToCheck, 10);
            await prisma.user.update({
                where: { email: targetEmail },
                data: { password: newHash }
            });
            console.log('Password RESET successfully.');
        } else {
            console.log('Password is already correct.');
        }
    } else {
        console.log(`\nTarget user ${targetEmail} NOT FOUND in this database.`);
    }

    console.log('--- USER DIAGNOSTIC V2 END ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
