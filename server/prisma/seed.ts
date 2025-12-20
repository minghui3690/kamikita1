
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@richdragon.com';
  const password = await bcrypt.hash('admin123', 10);
  
  // Check if admin exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
      // Generate Username: Admin + 4 Random Digits
      const random4 = Math.floor(1000 + Math.random() * 9000);
      const username = `Admin${random4}`;

      await prisma.user.create({
        data: {
          name: 'Super Admin',
          username: username,
          email: email,
          password: password,
          role: UserRole.ADMIN,
          referralCode: 'ADMIN001',
          isActive: true,
          walletBalance: 0,
          kyc: {
             phone: '08123456789', address: 'Headquarters', bankName: 'BCA', accountNumber: '1234567890', accountHolder: 'Rich Dragon', isVerified: true,
             gender: 'Man', birthDate: '1990-01-01', birthCity: 'Jakarta', birthTime: '12:00'
          }
        }
      });
      console.log('Admin user created successfully');
  } else {
      console.log('Admin user already exists');
  }

  // Check if manager exists
  const managerEmail = 'manager@richdragon.com';
  const managerPassword = await bcrypt.hash('manager123', 10);
  const existingManager = await prisma.user.findUnique({ where: { email: managerEmail } });
  
  if (!existingManager) {
      const username = `Manager${Math.floor(1000 + Math.random() * 9000)}`;
      const id = 'manager-' + Date.now();
      const kyc = JSON.stringify({
          phone: '081999888777', address: 'Ops Office', bankName: 'BCA', accountNumber: '999888777', accountHolder: 'Manager Ops', isVerified: true,
          gender: 'Woman', birthDate: '1992-02-02', birthCity: 'Surabaya', birthTime: '10:00'
      });
      // Using executeRawUnsafe to bypass Client Enum validation (since Client is locked)
      // Note: 'MANAGER' role must exist in DB Enum (handled by prisma db push)
      await prisma.$executeRawUnsafe(`
        INSERT INTO User (id, name, username, email, password, role, referralCode, isActive, walletBalance, kyc, joinedAt, totalEarnings, isKakaUnlocked)
        VALUES ('${id}', 'Operational Manager', '${username}', '${managerEmail}', '${managerPassword}', 'MANAGER', 'MGR001', 1, 0, '${kyc}', NOW(), 0, 0)
      `);
      console.log('Manager user created successfully');
  } else {
      console.log('Manager user already exists');
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
