import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { midtransService } from '../services/midtransService';

// ==========================================
// CORE TRANSACTION LOGIC
// ==========================================

export const createTransaction = async (req: Request, res: Response) => {
    try {
        const { userId, guest, items, paymentMethod, voucherCode, pointsRedeemed, paymentProof } = req.body;

        let user = null;
        let customer = null;
        let directUplineId: string | null = null;

        // 1. Resolve Identity
        if (userId) {
            user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) return res.status(404).json({ message: 'User not found' });
            directUplineId = user.uplineId;
        } else if (guest) {
            let referrerId = null;
            if (guest.referralCode) {
                const referrer = await prisma.user.findUnique({ where: { referralCode: guest.referralCode } });
                if (referrer) {
                    referrerId = referrer.id;
                    directUplineId = referrer.id;
                }
            }
            if (!directUplineId) {
                const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
                if (admin) {
                     directUplineId = admin.id;
                     referrerId = admin.id; // Assign to admin
                }
            }

            customer = await prisma.customer.create({
                data: {
                    name: guest.name,
                    email: guest.email,
                    phone: guest.phone,
                    referralCode: guest.referralCode,
                    referrerId: referrerId,
                    nameproduct: '' // Updated later
                }
            });
        } else {
            return res.status(400).json({ message: 'User ID or Guest details required' });
        }

        // 2. Calculate Totals
        let subtotal = 0;
        let totalPointsEarned = 0;
        const validItems = [];
        let mainProductName = '';

        for (const item of items) {
            const product = await prisma.product.findUnique({ where: { id: item.product.id } });
            if (product) {
                subtotal += product.price * item.quantity;
                totalPointsEarned += product.points * item.quantity;
                validItems.push({
                    product: { 
                        id: product.id, 
                        nameproduct: product.nameproduct,
                        name: product.nameproduct,
                        price: product.price, 
                        points: product.points,
                        image: product.image,
                        description: product.description,
                        pdfUrl: product.pdfUrl,
                        customRedirectUrl: product.customRedirectUrl,
                        isConsultation: product.isConsultation, // IMPORTANT
                        consultationQuota: product.consultationQuota,
                        activeDays: product.activeDays
                    },
                    quantity: item.quantity
                });
                if (mainProductName) mainProductName += ', ';
                mainProductName += product.nameproduct;
            }
        }

        // 3. System Settings
        const settings = await prisma.systemSettings.findFirst() || {
             commissionLevels: 3,
             levelPercentages: [20, 5, 2],
             pointRate: 1000,
             taxPercentage: 11
        };

        const taxPercentage = settings.taxPercentage;
        const pointRate = settings.pointRate; 

        let discountAmount = 0;
        const taxAmount = (subtotal - discountAmount) * (taxPercentage / 100);
        const pointsRedeemedValue = (pointsRedeemed || 0) * pointRate;
        const totalAmount = Math.max(0, (subtotal - discountAmount + taxAmount) - pointsRedeemedValue);
        
        // 4. Create Transaction
        const transaction = await prisma.transaction.create({
            data: {
                userId: user?.id,
                customerId: customer?.id,
                items: JSON.stringify(validItems),
                nameproduct: mainProductName,
                subtotal,
                taxAmount,
                discountAmount,
                pointsRedeemed: Number(pointsRedeemed) || 0,
                pointsRedeemedValue,
                totalAmount,
                totalPointsEarned,
                status: 'PENDING',
                paymentMethod,
                paymentProof,
                voucherCode,
                commissionsDistributed: false
            }
        });

        // 5. Update User Balance (Points Redeemed)
        if (user && pointsRedeemed > 0) {
             await prisma.user.update({
                where: { id: user.id },
                data: { walletBalance: { decrement: pointsRedeemed } }
            });
        }

        let snapToken = null;

        // 6. Handle Payment Method
        if (paymentMethod === 'GATEWAY') {
            const payer = user || customer;
            try {
                snapToken = await midtransService.createTransactionToken(transaction, payer);
            } catch (err) {
                console.error('Midtrans Token Error:', err);
                // Return transaction but without token? Or fail?
                // Let's return error inside response
                return res.status(201).json({ ...transaction, snapToken: null, error: 'Failed to generate payment token' });
            }
        } else if (paymentMethod === 'BANK_TRANSFER') {
            // Manual Transfer Logic (Legacy/Current Flow)
            // Auto-Approve to PAID immediately
             await prisma.transaction.update({ where: { id: transaction.id }, data: { status: 'PAID' } });
            
             // Trigger Post-Payment Actions
             await distributeCommissions(transaction.id);
             await issueConsultationCredits(transaction.id);
             await extendMembership(transaction.id); // [NEW] Expiry Logic
             
             // Refresh transaction status for response
             transaction.status = 'PAID';
        }

        res.status(201).json({ ...transaction, snapToken });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating transaction', error });
    }
};

export const getTransactions = async (req: any, res: Response) => {
    try {
        const { userId, scope } = req.query;
        let where: any = {};
        const currentUser = req.user;
        const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER';

        // MEMBER: GROUP HISTORY (Commissions Received)
        if (!isAdmin && scope === 'group') {
             const commissions = await prisma.commissionLog.findMany({
                 where: { beneficiaryId: currentUser.id },
                 include: {
                     transaction: {
                         include: {
                             user: { select: { name: true } },
                             customer: { select: { name: true } }
                         }
                     }
                 },
                 orderBy: { timestamp: 'desc' }
             });

             const formatted = commissions.map(c => ({
                 ...c.transaction,
                 id: c.transaction.id, // Explicitly keep transaction ID for display details?
                 commissionId: c.id, // [NEW] For archiving the log
                 userName: c.transaction.user?.name || c.transaction.customer?.name || 'Unknown',
                 // Attach commission info for display if needed
                 _commissionAmount: c.amount,
                 _commissionLevel: c.level
             }));
             
             return res.json(formatted);
        }

        // STANDARD LOGIC (Personal or Admin View)
        if (!isAdmin) {
            where.userId = currentUser.id;
        } else {
             if (userId) where.userId = String(userId);
        }
        
        const transactions = await prisma.transaction.findMany({ 
            where, 
            orderBy: { timestamp: 'desc' },
            include: {
                user: { select: { name: true } },
                customer: { select: { name: true } }
            }
        });

        const formatted = transactions.map(t => ({
            ...t,
            userName: t.user?.name || t.customer?.name || 'Unknown'
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching transactions', error });
    }
};

export const toggleArchive = async (req: any, res: Response) => {
    try {
        const { ids, target, archive } = req.body; // target: 'TRANSACTION' | 'COMMISSION'
        const currentUser = req.user;
        const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER';
        const isArchive = archive === true;

        if (!ids || !Array.isArray(ids)) return res.status(400).json({ message: 'Invalid IDs' });

        if (target === 'COMMISSION') {
            // Archive Commission Logs
            // User must be the beneficiary or Admin
            if (!isAdmin) {
                const logs = await prisma.commissionLog.findMany({ 
                    where: { id: { in: ids }, beneficiaryId: currentUser.id }
                });
                if (logs.length !== ids.length) return res.status(403).json({ message: 'Unauthorized access to some records' });
            }
            
            await prisma.commissionLog.updateMany({
                where: { id: { in: ids } },
                data: { isArchived: isArchive }
            });

        } else {
            // Archive Transactions (Default)
            // User must be the owner (userId) or Admin
            if (!isAdmin) {
                const txs = await prisma.transaction.findMany({
                     where: { id: { in: ids }, userId: currentUser.id }
                });
                // Allow guests? No, memebrs only here.
                if (txs.length !== ids.length) return res.status(403).json({ message: 'Unauthorized access to some records' });
            }

            await prisma.transaction.updateMany({
                where: { id: { in: ids } },
                data: { isArchived: isArchive }
            });
        }

        res.json({ message: 'Success' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating archive status', error });
    }
};

// ==========================================
// WEBHOOK / NOTIFICATION
// ==========================================

export const handleMidtransNotification = async (req: Request, res: Response) => {
    try {
        const notification = req.body;
        const statusResponse = await midtransService.verifyNotification(notification);
        
        const orderId = statusResponse.order_id;
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        console.log(`[Midtrans] Notification: ${orderId} | ${transactionStatus} | ${fraudStatus}`);

        const transaction = await prisma.transaction.findUnique({ where: { id: orderId } });
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

        if (transaction.status === 'PAID') return res.json({ message: 'Already processed' });

        let newStatus: string = transaction.status;

        if (transactionStatus == 'capture') {
            if (fraudStatus == 'challenge') {
                // Challenge means it's pending review. We keep it PENDING.
                newStatus = 'PENDING'; 
            } else if (fraudStatus == 'accept') {
                newStatus = 'PAID';
            }
        } else if (transactionStatus == 'settlement') {
            newStatus = 'PAID';
        } else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') {
            newStatus = 'FAILED';
        } else if (transactionStatus == 'pending') {
            newStatus = 'PENDING';
        }

        // Update Status
        if (newStatus !== transaction.status) {
            await prisma.transaction.update({
                where: { id: orderId },
                data: { status: newStatus as any }
            });
        }

        // Trigger Actions if PAID
        // Cast transaction.status to string to avoid "no overlap" error if TS is confused
        if (newStatus === 'PAID' && (transaction.status as string) !== 'PAID') {
            await distributeCommissions(orderId);
            await issueConsultationCredits(orderId);
            await extendMembership(orderId);
        }

        res.json({ message: 'Notification processed' });
    } catch (error) {
        console.error('Midtrans Notification Error:', error);
        res.status(500).json({ message: 'Notification error', error });
    }
};

// ==========================================
// SHARED HELPER FUNCTIONS
// ==========================================

const distributeCommissions = async (transactionId: string) => {
    try {
        const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!transaction || transaction.commissionsDistributed) return;

        // Identify Upline
        let directUplineId: string | null = null;
        let sourceName = 'Unknown';

        if (transaction.userId) {
            const user = await prisma.user.findUnique({ where: { id: transaction.userId } });
            directUplineId = user?.uplineId || null;
            sourceName = user?.name || 'Unknown Member';
        } else if (transaction.customerId) {
            const cust = await prisma.customer.findUnique({ where: { id: transaction.customerId } });
            directUplineId = cust?.referrerId || null;
            sourceName = `Guest ${cust?.name}`;
        }

        if (!directUplineId || transaction.totalPointsEarned <= 0) return;

        const settings = await prisma.systemSettings.findFirst() || {
            commissionLevels: 3,
            levelPercentages: [20, 5, 2],
            pointRate: 1000
        };

        const definedLevels = settings.levelPercentages as number[] || [20, 5, 2];
        const maxLevels = settings.commissionLevels;
        const levels = definedLevels.slice(0, maxLevels); 
        const pointRate = settings.pointRate;

        let currentBeneficiaryId = directUplineId;

        for (let i = 0; i < levels.length; i++) {
            if (!currentBeneficiaryId) break;
            
            const beneficiary = await prisma.user.findUnique({ where: { id: currentBeneficiaryId } });
            if (!beneficiary || !beneficiary.isActive) {
                if (beneficiary) currentBeneficiaryId = beneficiary.uplineId || ''; 
                continue;
            }

            const percentage = levels[i];
            const commissionPoints = transaction.totalPointsEarned * (percentage / 100); 
            
            if (commissionPoints > 0) {
                // 1. Log Commission
                await prisma.commissionLog.create({
                    data: {
                        transactionId: transaction.id,
                        beneficiaryId: beneficiary.id,
                        sourceUserId: transaction.userId || null,
                        level: i + 1,
                        amount: commissionPoints, 
                        timestamp: new Date()
                    }
                });
                
                // 2. Log Wallet
                await prisma.walletLog.create({
                    data: {
                        userId: beneficiary.id,
                        type: 'COMMISSION',
                        amount: commissionPoints,
                        description: `Commission Lvl ${i+1} from ${sourceName}`,
                        timestamp: new Date()
                    }
                });

                // 3. Update User Balance & Earnings
                await prisma.user.update({
                     where: { id: beneficiary.id },
                     data: {
                         walletBalance: { increment: commissionPoints },
                         totalEarnings: { increment: commissionPoints * pointRate } 
                     }
                });
            }

            currentBeneficiaryId = beneficiary.uplineId || '';
        }

        // Mark as distributed
        await prisma.transaction.update({
            where: { id: transaction.id },
            data: { commissionsDistributed: true }
        });

    } catch (e) {
        console.error('Error distributing commissions:', e);
    }
};

const issueConsultationCredits = async (transactionId: string) => {
    try {
        const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!transaction) return;

        const items = JSON.parse(transaction.items as string);
        
        for (const item of items) {
             const product = item.product;
             if (product && product.isConsultation && product.consultationQuota > 0) {
                  const totalSessions = product.consultationQuota * item.quantity;
                  
                  const credit = await prisma.consultationCredit.create({
                      data: {
                          userId: transaction.userId,
                          customerId: transaction.customerId,
                          productName: product.nameproduct || product.name || 'Consultation',
                          totalQuota: totalSessions,
                          usedQuota: 0,
                      }
                  });

                  // Log Magic link (For Guest mainly, or debug)
                  // In production, send email here.
                  const magicLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/booking?token=${credit.magicToken}`;
                  console.log(`[Consultation] Credit Issued. Magic Link: ${magicLink}`);
             }
        }
    } catch (e) {
        console.error('Error issuing credits:', e);
    }
};

export const extendMembership = async (transactionId: string) => {
    try {
        const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!transaction || !transaction.userId) return;

        const items = JSON.parse(transaction.items as string);
        let totalActiveDaysToAdd = 0;

        for (const item of items) {
            const product = await prisma.product.findUnique({ where: { id: item.product.id } });
            if (product && product.activeDays > 0) {
                totalActiveDaysToAdd += (product.activeDays * item.quantity);
            }
        }

        if (totalActiveDaysToAdd > 0) {
            const user = await prisma.user.findUnique({ where: { id: transaction.userId } });
            if (!user) return;

            const now = new Date();
            let currentExpiry = user.membershipExpiryDate ? new Date(user.membershipExpiryDate) : now;

            // If expiry is in the past, start from now. If in future, add to it.
            if (currentExpiry < now) {
                currentExpiry = now;
            }

            const newExpiry = new Date(currentExpiry.getTime() + (totalActiveDaysToAdd * 24 * 60 * 60 * 1000));

            await prisma.user.update({
                where: { id: user.id },
                data: { membershipExpiryDate: newExpiry }
            });
            console.log(`[Membership] Extended for user ${user.name} by ${totalActiveDaysToAdd} days. New expiry: ${newExpiry}`);
        }
    } catch (e) {
        console.error('Error extending membership:', e);
    }
};
