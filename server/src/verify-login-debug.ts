
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'ab@richdragon.com';
    const passwordToCheck = 'admin123';

    console.log(`Checking user: ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        console.log('User NOT FOUND in database.');
        return;
    }

    console.log('User Found:', {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        passwordHash: user.password.substring(0, 20) + '...' // Verify it's a hash
    });

    const isMatch = await bcrypt.compare(passwordToCheck, user.password);
    console.log(`Password 'admin123' match: ${isMatch}`);

    if (!isMatch) {
       console.log('Password mismatch. Resetting to admin123...');
       const newHash = await bcrypt.hash(passwordToCheck, 10);
       await prisma.user.update({
           where: { email },
           data: { password: newHash }
       });
       console.log('Password RESET to admin123 successfully.');
    }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
