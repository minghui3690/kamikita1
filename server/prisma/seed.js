const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@richdragon.com' },
    update: {},
    create: {
      email: 'admin@richdragon.com',
      name: 'Super Admin',
      password,
      role: 'ADMIN',
      referralCode: 'ADMIN',
      walletBalance: 0,
      totalEarnings: 0,
      isActive: true,
      kyc: {
         phone: '000000', address: 'Admin HQ', bankName: 'BCA', accountNumber: '123', accountHolder: 'Rich Dragon', isVerified: true,
         gender: 'Man', birthDate: '1990-01-01', birthCity: 'Jakarta', birthTime: '00:00'
      }
    },
  });

  console.log({ admin });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
