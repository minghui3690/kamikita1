import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const getCustomers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { hidden } = req.query;
    const showHidden = hidden === 'true';

    console.log(`[getCustomers] User: ${userId} (${userRole}), ShowHidden: ${showHidden}`);

    // Base where clause
    let whereClause: any = { isArchived: showHidden };

    if (userRole === 'ADMIN' || userRole === 'MANAGER') {
      // Admin/Manager sees ALL (or subset if they wanted, but here ALL)
      // Logic from before: just keep whereClause as is (archived filter)
    } else {
      // Member sees only their referrals
      whereClause = { ...whereClause, referrerId: userId };
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        transactions: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
            timestamp: true,
            items: true
          },
          orderBy: { timestamp: 'desc' }
        },
        referrer: {
          select: { name: true, email: true } // Helpful for Admin to see who referred
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`[getCustomers] Found: ${customers.length} records`);

        const customersWithDetails = customers.map(c => {
             const transactions = c.transactions.map((t: any) => {
                 let items = t.items;
                 let productNames = [];
                 try {
                     if (typeof items === 'string') items = JSON.parse(items);
                     if (Array.isArray(items)) {
                         productNames = items.map((i: any) => i.product.name);
                     }
                 } catch (e) {}
                 
                 return {
                     ...t,
                     productNames: productNames.join(', ')
                 };
             });

             return {
                 ...c,
                 transactions,
                 lastProductName: transactions[0]?.productNames || '-'
             };
        });

        res.json(customersWithDetails);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customers' });
  }
};

export const sendCustomerEmail = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { email, subject, message, fileUrl, fileName } = req.body;
        // const file = req.file; // If we had actual file upload middleware

        const customer = await prisma.customer.findUnique({ where: { id } });
        if (!customer) return res.status(404).json({ message: 'Customer not found' });

        const recipient = email || customer.email;
        const emailSubject = subject || 'Information regarding your order';
        const emailBody = message || 'Please accept the attached file.';

        console.log('\n=============================================================');
        console.log('                 MOCK EMAIL SERVER (CUSTOMER)                ');
        console.log('=============================================================');
        console.log(`TO:      ${recipient}`);
        console.log(`SUBJECT: ${emailSubject}`);
        console.log('-------------------------------------------------------------');
        console.log('BODY:');
        console.log(emailBody);
        
        if (fileName && fileUrl) {
             console.log('\n[System]: Attached File: ' + fileName);
             console.log('[System]: File Size (Base64): ' + Math.round(fileUrl.length / 1024) + ' KB');
        } else {
             console.log('\n[System]: Attached File: (No Attachment)');
        }
        console.log('=============================================================\n');
        
        // Update Customer Status
        const updatedCustomer = await prisma.customer.update({
            where: { id },
            data: {
                emailStatus: 'SENT',
                lastEmailSentAt: new Date()
            },
            include: {
                transactions: { select: { id: true, totalAmount: true, status: true, timestamp: true, items: true }, orderBy: { timestamp: 'desc' } },
                referrer: { select: { name: true, email: true } }
            }
        });
        
        // Mimic the formatting from getCustomers for consistency if needed, 
        // but for now just returning the raw updated customer is usually enough 
        // or frontend can just toggle status locally if it trusts the success.
        
        await new Promise(resolve => setTimeout(resolve, 1000));

        res.json({ message: `Email sent to ${recipient}`, customer: updatedCustomer });
    } catch (error) {
        console.error('Send customer email error:', error);
        res.status(500).json({ message: 'Error sending email', error });
    }
};

export const archiveCustomers = async (req: Request, res: Response) => {
    try {
        const { ids, archive } = req.body; // ids: string[], archive: boolean
        if (!Array.isArray(ids)) return res.status(400).json({ message: 'Invalid IDs' });

        await prisma.customer.updateMany({
            where: { id: { in: ids } },
            data: { isArchived: archive }
        });

        res.json({ message: 'Customers updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error archiving customers', error });
    }
};

export const upgradeToMember = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { password, username, uplineReferralCode, email } = req.body;

    // 1. Find Customer
    const customer = await prisma.customer.findUnique({ where: { id: id } });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Use provided email or fallback to customer email, then check for existence
    const finalEmail = email || customer.email;
    const existingUser = await prisma.user.findUnique({ where: { email: finalEmail } });
    if (existingUser) {
        return res.status(400).json({ message: `Email ${finalEmail} is already registered to a Member.` });
    }
        // Determine Upline ID
        let targetUplineId = customer.referrerId;
        
        if (uplineReferralCode) {
            const uplineUser = await prisma.user.findUnique({ where: { referralCode: uplineReferralCode } });
            if (!uplineUser) return res.status(400).json({ message: 'Invalid Upline Referral Code' });
            targetUplineId = uplineUser.id;
        }

        // Prepare new user data
        const hashedPassword = await bcrypt.hash(password, 10);
        
        let finalUsername = username;
        if (!finalUsername) {
            // Auto-generate if not provided
            const firstName = customer.name.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            let isUnique = false;
            while (!isUnique) {
                const random4 = Math.floor(1000 + Math.random() * 9000);
                finalUsername = `${firstName}${random4}`;
                const check = await prisma.user.findUnique({ where: { username: finalUsername } });
                if (!check) isUnique = true;
            }
        } else {
             // Check provided username
             const check = await prisma.user.findUnique({ where: { username: finalUsername } });
             if (check) return res.status(400).json({ message: 'Username already taken' });
        }

        const newRefCode = 'RDA' + Math.floor(Math.random() * 100000); // Simple random for now

        // Transaction: Create User -> Move Data -> Archive Customer
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create User
            const newUser = await tx.user.create({
                data: {
                    name: customer.name,
                    email: finalEmail,
                    username: finalUsername,
                    password: hashedPassword,
                    referralCode: newRefCode,
                    uplineId: targetUplineId, // Resolved ID
                    role: 'MEMBER',
                    walletBalance: 0,
                    kyc: {
                        phone: customer.phone,
                        address: '', 
                        isVerified: false // Needs to do KYC again or maybe we copy what we have
                    }
                }
            });

            // 2. Migrate Transactions
            // Link existing transactions to this new User
            await tx.transaction.updateMany({
                where: { customerId: customer.id },
                data: { userId: newUser.id }
            });

            // 3. Migrate Consultation Credits
            await tx.consultationCredit.updateMany({
                where: { customerId: customer.id },
                data: { userId: newUser.id }
            });

            // 4. Archive Customer
            await tx.customer.update({
                where: { id: customer.id },
                data: { isArchived: true }
            });

            return newUser;
        });

        res.json({ message: 'Upgrade successful', user: result });

    } catch (error) {
        console.error('Upgrade error:', error);
        res.status(500).json({ message: 'Error upgrading customer', error });
    }
};
