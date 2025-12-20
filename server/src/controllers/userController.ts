import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { extendMembership } from './transactionController';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

export const updateMe = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const { name, email, password, kyc, avatar } = req.body;

        const data: any = { };
        if (name) data.name = name;
        if (email) data.email = email;
        if (kyc) data.kyc = kyc;
        if (avatar !== undefined) data.avatar = avatar; // Allow setting to empty/null if needed, or update

        if (password && password.trim() !== '') {
            data.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true, name: true, email: true, role: true, 
                referralCode: true, uplineId: true, isActive: true, 
                kyc: true, avatar: true, walletBalance: true
            } // Select safe fields
        });

        res.json(updatedUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating detailed profile', error });
    }
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                username: true, // [NEW] - Needed for Admin Search
                email: true,
                role: true,
                referralCode: true,
                uplineId: true,
                joinedAt: true,
                isActive: true,
                isKakaUnlocked: true,
                isHumanDesignUnlocked: true,
                isAiAssistantUnlocked: true,
                hdAccessLevel1: true,
                hdAccessLevel2: true,
                hdAccessLevel3: true,
                hdAccessLevel4: true,
                kyc: true,
                avatar: true, // [NEW] Added for Testimonial Sync
                membershipExpiryDate: true // [NEW] Membership Expiry
            }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error });
    }
};

export const toggleUserStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({ where: { id } });

        if (!user) return res.status(404).json({ message: 'User not found' });

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { isActive: !user.isActive }
        });

        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Error updating user status', error });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        // Cleanup related non-financial records first
        await prisma.humanDesignProfile.deleteMany({ where: { userId: id } });
        await prisma.withdrawalRequest.deleteMany({ where: { userId: id } }); // Delete withdrawals (Audit concern? Maybe, but user requested Delete)
        // Note: We do NOT delete Transactions or WalletLogs to preserve financial integrity.
        // If the user has transactions, the delete below will fail (as it should).
        
        await prisma.user.delete({ where: { id } });
        res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
        // Check for Foreign Key Constraint violation
        if (error.code === 'P2003') {
            return res.status(400).json({ message: 'Cannot delete user with active Transactions or financial history. Please deactivate instead.' });
        }
        res.status(500).json({ message: 'Error deleting user', error });
    }
};

export const toggleKakaAccess = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({ where: { id } });
        
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        const updatedUser = await prisma.user.update({
            where: { id },
            data: { isKakaUnlocked: !user.isKakaUnlocked }
        });
        
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Error toggling Kaka access', error });
    }
};

export const toggleHumanDesignAccess = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({ where: { id } });
        
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        const updatedUser = await prisma.user.update({
            where: { id },
            data: { isHumanDesignUnlocked: !user.isHumanDesignUnlocked } // Toggles the boolean
        });
        
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Error toggling Human Design access', error });
    }
};

export const toggleAiAssistantAccess = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({ where: { id } });
        
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        const updatedUser = await prisma.user.update({
            where: { id },
            data: { isAiAssistantUnlocked: !user.isAiAssistantUnlocked }
        });
        
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Error toggling AI Assistant access', error });
    }
};

export const updateHDAccessLevels = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { level1, level2, level3, level4 } = req.body;
        
        const updatedUser = await prisma.user.update({
            where: { id },
            data: { 
                hdAccessLevel1: level1,
                hdAccessLevel2: level2,
                hdAccessLevel3: level3,
                hdAccessLevel4: level4
            }
        });
        
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Error updating HD access levels', error });
    }
};

export const getDashboardStats = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.role === 'ADMIN' || user.role === 'MANAGER') {
             const [totalMembers, transactions, withdrawals] = await Promise.all([
                 prisma.user.count({ where: { role: 'MEMBER' } }),
                 prisma.transaction.findMany({ where: { status: 'PAID' } }),
                 prisma.withdrawalRequest.count({ where: { status: 'PENDING' } })
             ]);

             const totalRevenue = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
             const itemsSold = transactions.reduce((sum, t) => {
                // @ts-ignore
                const items = typeof t.items === 'string' ? JSON.parse(t.items) : t.items;
                // @ts-ignore
                return sum + (Array.isArray(items) ? items.reduce((a, b) => a + b.quantity, 0) : 0);
             }, 0);

             return res.json({
                 isAdmin: true,
                 totalMembers,
                 totalRevenue,
                 itemsSold,
                 pendingWithdrawals: withdrawals
             });
        } else {
             // Member Stats
             // 1. Personal Sales
             const myPurchases = await prisma.transaction.aggregate({ 
                 where: { userId: userId, status: 'PAID' },
                 _sum: { totalAmount: true }
             });

             // 2. Group Sales (Level 1 & 2)
             const groupSales = await prisma.transaction.aggregate({
                 where: {
                     status: 'PAID',
                     user: {
                         OR: [
                             { uplineId: userId }, // Level 1
                             { upline: { uplineId: userId } } // Level 2
                         ]
                     }
                 },
                 _sum: { totalAmount: true }
             });

             const totalSalesVolume = (myPurchases._sum.totalAmount || 0) + (groupSales._sum.totalAmount || 0);

             // Fetch SystemSettings for pointRate
             const settings = await prisma.systemSettings.findFirst();
             const pointRate = settings?.pointRate || 1000;

             return res.json({
                 isAdmin: false,
                 totalPoints: user.walletBalance,
                 withdrawalBalance: user.walletBalance * pointRate, 
                 lifetimeEarnings: user.totalEarnings,
                 totalSalesVolume: totalSalesVolume
             });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching stats', error });
    }
};

// -- Network Logic --

export const getNetwork = async (req: any, res: Response) => {
    try {
        const currentUserId = req.user.id;
        const targetUserId = req.query.viewUser || currentUserId;
        
        const allUsers = await prisma.user.findMany({ select: { id: true, name: true, email: true, uplineId: true, joinedAt: true, isActive: true, totalEarnings: true, walletBalance: true } });
        
        const salesMap = new Map();
        const sales = await prisma.transaction.groupBy({
             by: ['userId'],
             _sum: { totalAmount: true },
             where: { status: 'PAID' }
        });
        sales.forEach(s => salesMap.set(s.userId, s._sum.totalAmount || 0));

        // Fetch Max Depth from Settings
        const settings = await prisma.systemSettings.findFirst();
        const maxDepth = settings?.commissionLevels || 2; // Default to 2 if not set, dynamic from DB
        
        // Build Tree
        const buildTree = (uid: string, currentDepth: number): any => {
            if (currentDepth > maxDepth) return undefined;
            
            const user = allUsers.find(u => u.id === uid);
            if (!user) return null;
            
            const children = allUsers
                .filter(u => u.uplineId === uid)
                .map(u => buildTree(u.id, currentDepth + 1))
                .filter(Boolean);
            
            return {
                ...user,
                totalSales: salesMap.get(uid) || 0,
                children: children.length > 0 ? children : undefined
            };
        };

        const tree = buildTree(targetUserId, 0);

        // Build Flat List (Downlines only)
        const getDownlines = (uid: string, level: number = 1): any[] => {
             if (level > maxDepth) return [];
             
             const children = allUsers.filter(u => u.uplineId === uid);
             let list: any[] = [];
             children.forEach(c => {
                 list.push({ ...c, level, totalSales: salesMap.get(c.id) || 0 });
                 list = [...list, ...getDownlines(c.id, level + 1)];
             });
             return list;
        };

        const flatList = getDownlines(targetUserId);

        // Stats
        const frontline = allUsers.filter(u => u.uplineId === targetUserId).length;
        const groupCount = flatList.length;

        res.json({
            tree,
            list: flatList,
            stats: { frontline, groupCount }
        });

    } catch (error) {
        res.status(500).json({ message: 'Error fetching network', error });
    }
};

// -- Wallet & Withdrawal Logic --

export const getWalletHistory = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        
        // 1. Fetch Commissions
        const commissions = await prisma.commissionLog.findMany({
            where: { beneficiaryId: userId },
            orderBy: { timestamp: 'desc' }
        });

        // 2. Fetch Wallet Logs (Withdrawals, Transfers, etc)
        // FILTER OUT 'COMMISSION' type because we already fetch them from CommissionLog
        const walletLogs = await prisma.walletLog.findMany({
            where: { 
                userId: userId,
                type: { not: 'COMMISSION' } 
            },
            orderBy: { timestamp: 'desc' }
        });

        // 3. Enrich and Merge
        const enrichedCommissions = await Promise.all(commissions.map(async (log) => {
             let sourceName = 'Unknown';
             if (log.sourceUserId) {
                 const u = await prisma.user.findUnique({ where: { id: log.sourceUserId }, select: { name: true } });
                 if (u) sourceName = u.name;
             } else {
                 // Check if it's a guest via Transaction
                 const tx = await prisma.transaction.findUnique({ where: { id: log.transactionId }, include: { customer: true } });
                 if (tx?.customer) sourceName = `Guest ${tx.customer.name}`;
             }

             const transaction = await prisma.transaction.findUnique({ where: { id: log.transactionId } });
             let productName = '-';
             if (transaction && transaction.items) {
                 // @ts-ignore
                 const items = typeof transaction.items === 'string' ? JSON.parse(transaction.items) : transaction.items;
                 if (Array.isArray(items) && items.length > 0) {
                     productName = items.map((i: any) => i.product?.name).join(', ');
                 }
             }
             return {
                 id: log.id,
                 type: 'COMMISSION', // Normalize type
                 amount: log.amount,
                 timestamp: log.timestamp,
                 description: `Commission from Level ${log.level}`,
                 details: {
                    sourceUserName: sourceName,
                    productName,
                    level: log.level
                 }
             };
        }));

        const normalizedWalletLogs = walletLogs.map(log => ({
            id: log.id,
            type: log.type,
            amount: log.amount,
            timestamp: log.timestamp,
            description: log.description || log.type,
            details: {}
        }));

        const unified = [...enrichedCommissions, ...normalizedWalletLogs]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        res.json(unified);
    } catch(e) {
        res.status(500).json({message: 'Error fetching history', error: e});
    }
};

export const getAdminWalletLogs = async (req: Request, res: Response) => {
    try {
        const { hidden } = req.query;
        const showHidden = hidden === 'true';

        // Fetch ALL Logs
         const [commissions, walletLogs] = await Promise.all([
             prisma.commissionLog.findMany({
                 where: { isArchived: showHidden },
                 orderBy: { timestamp: 'desc' },
                 include: { beneficiary: { select: { name: true } } }
             }),
             prisma.walletLog.findMany({
                 where: { 
                    type: { not: 'COMMISSION' },
                    isArchived: showHidden
                 },
                 orderBy: { timestamp: 'desc' },
                 include: { user: { select: { id: true, name: true, email: true } } }
             })
         ]);

         const enrichedCommissions = await Promise.all(commissions.map(async (log) => {
             let sourceName = 'Unknown';
             if (log.sourceUserId) {
                 const u = await prisma.user.findUnique({ where: { id: log.sourceUserId }, select: { name: true } });
                 if (u) sourceName = u.name;
             } else {
                 const tx = await prisma.transaction.findUnique({ where: { id: log.transactionId }, include: { customer: true } });
                 if (tx?.customer) sourceName = `Guest ${tx.customer.name}`;
             }
             
             return {
                 id: log.id,
                 userId: log.beneficiaryId,
                 userName: log.beneficiary?.name || 'Unknown',
                 type: 'COMMISSION',
                 amount: log.amount,
                 timestamp: log.timestamp,
                 description: `Commission Level ${log.level} from ${sourceName}`,
                 isArchived: log.isArchived
             };
         }));

         const normalizedWalletLogs = walletLogs.map(log => ({
             id: log.id,
             userId: log.userId,
             userName: log.user?.name || 'Unknown',
             type: log.type,
             amount: log.amount,
             timestamp: log.timestamp,
             description: log.description || log.type,
             isArchived: log.isArchived
         }));

         const unified = [...enrichedCommissions, ...normalizedWalletLogs]
             .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

         res.json(unified);
    } catch (e) {
        res.status(500).json({ message: 'Error fetching admin wallet logs', error: e });
    }
};

export const archiveAdminLogs = async (req: Request, res: Response) => {
    try {
        const { items, archive } = req.body; // items: { id: string, type: string }[]
        const isArchived = archive !== false; 

        const commIds = items.filter((i: any) => i.type === 'COMMISSION').map((i: any) => i.id);
        const walletIds = items.filter((i: any) => i.type !== 'COMMISSION').map((i: any) => i.id);

        await Promise.all([
            commIds.length > 0 ? prisma.commissionLog.updateMany({
                where: { id: { in: commIds } },
                data: { isArchived }
            }) : Promise.resolve(),
            walletIds.length > 0 ? prisma.walletLog.updateMany({
                where: { id: { in: walletIds } },
                data: { isArchived }
            }) : Promise.resolve()
        ]);

        res.json({ message: 'Logs updated' });
    } catch (error) {
        res.status(500).json({ message: 'Error archiving logs', error });
    }
};

export const getWithdrawals = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({where:{id:userId}});
        
        let where = {};
        if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
            where = { userId };
        }
        
        const withdrawals = await prisma.withdrawalRequest.findMany({
            where,
            orderBy: { requestDate: 'desc' }
        });
        res.json(withdrawals);
    } catch(e) {
        res.status(500).json({message: 'Error fetching withdrawals', error: e});
    }
};

export const requestWithdrawal = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const { amount, bankDetails } = req.body;
        
        const user = await prisma.user.findUnique({where: {id: userId}});
        if (!user) return res.status(404).json({message: 'User not found'});
        
        const settings = await prisma.systemSettings.findFirst();
        const pointRate = settings?.pointRate || 1000;
        const maxRp = user.walletBalance * pointRate;
        
        if (amount > maxRp) return res.status(400).json({message: 'Insufficient balance'});
        
        const wr = await prisma.withdrawalRequest.create({
            data: {
                userId,
                userName: user.name,
                amount: Number(amount),
                bankDetails: bankDetails || 'Default Bank',
                status: 'PENDING',
                requestDate: new Date()
            }
        });
        
        // Deduct from wallet immediately or on approval? 
        // Standard is deduct immediately (lock funds).
        // Since walletBalance is Points, we deduct Points.
        const pointsToDeduct = amount / pointRate;
        
        await prisma.user.update({
            where: { id: userId },
            data: {
                walletBalance: { decrement: pointsToDeduct }
            }
        });
        
        await prisma.walletLog.create({
            data: {
                userId,
                type: 'WITHDRAWAL',
                amount: -pointsToDeduct, // negative or positive? Log usually amount involved. 
                // Let's store positive and type implies direction, or negative. 
                // The previous log was +commission. 
                // Let's keep consistency.
                description: `Withdrawal Request ID: ${wr.id}`
            }
        });

        res.json(wr);
    } catch(e) {
        res.status(500).json({message: 'Error requesting withdrawal', error: e});
    }
};

export const cancelWithdrawalRequest = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const wr = await prisma.withdrawalRequest.findFirst({
            where: { id, userId }
        });
        
        if (!wr) return res.status(404).json({message: 'Withdrawal request not found'});
        if (wr.status !== 'PENDING') return res.status(400).json({message: 'Cannot cancel request. Status is ' + wr.status});
        
        // Update Status
        await prisma.withdrawalRequest.update({
            where: { id },
            data: { status: 'CANCELLED' }
        });
        
        // Refund Points
        const settings = await prisma.systemSettings.findFirst();
        const pointRate = settings?.pointRate || 1000;
        const pointsToRefund = wr.amount / pointRate;
        
        await prisma.user.update({
            where: { id: userId },
            data: { walletBalance: { increment: pointsToRefund } }
        });
        
        // Log Refund
        await prisma.walletLog.create({
            data: {
                userId,
                type: 'REFUND',
                amount: pointsToRefund,
                description: `Cancelled Withdrawal ID: ${wr.id}`
            }
        });
        
        res.json({message: 'Withdrawal cancelled and refunded'});
    } catch (e) {
        console.error(e);
        res.status(500).json({message: 'Error cancelling withdrawal', error: e});
    }
};

export const processWithdrawalRequest = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { status, proofImage, proofLink, rejectionReason } = req.body;
        
        const wr = await prisma.withdrawalRequest.findUnique({ where: { id } });
        if (!wr) return res.status(404).json({ message: 'Request not found' });
        
        // Allow if PENDING, or if updating proof for APPROVED request
        if (wr.status !== 'PENDING') {
            const isJustUpdatingProof = wr.status === 'APPROVED' && status === 'APPROVED';
            if (!isJustUpdatingProof) {
                return res.status(400).json({ message: `Request is already ${wr.status}` });
            }
        }
        
        const updated = await prisma.withdrawalRequest.update({
            where: { id },
            data: {
                status,
                processDate: new Date(),
                adminProofImage: proofImage,
                adminProofLink: proofLink,
                rejectionReason
            }
        });
        
        if (status === 'REJECTED') {
            // REFUND POINTS
            // Calculate points: amount / pointRate (need settings, but assuming 1000 for safety or fetch)
            // Safer to use settings.pointRate.
            const settings = await prisma.systemSettings.findFirst();
            const pointRate = settings?.pointRate || 1000;
            const refundPoints = wr.amount / pointRate;

            await prisma.user.update({
                where: { id: wr.userId },
                data: { walletBalance: { increment: refundPoints } }
            });
            
            await prisma.walletLog.create({
                data: {
                    userId: wr.userId,
                    type: 'WITHDRAWAL_REFUND',
                    amount: refundPoints,
                    description: `Refund Withdrawal ${wr.id}: ${rejectionReason}`,
                    timestamp: new Date()
                }
            });
        }
        
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error processing withdrawal', error });
    }
};

export const getRecentActions = async (req: any, res: Response) => {
    try {
        const { hidden } = req.query;
        const showHidden = hidden === 'true';

        // Fetch last 50 transactions and withdrawals
        // If Admin -> All
        // If Member -> My Own + Maybe Direct Downline? User request implied "from network member below". 
        // For simplicity, let's show GLOBAL actions for Admin, and OWN actions for Member, 
        // OR as requested: "recent transaction dari jaringan member dibawahnya".

        const userId = req.user.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        let whereTx: any = { isArchived: showHidden };
        let whereWd: any = { isArchived: showHidden };

        if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
             // Fetch all downline IDs first? This is heavy.
             // Let's stick to OWN actions for now unless explicitly "Network Activity Feed" is needed.
             // Re-reading user request: "recent transaction dari jaringan member dibawahnya".
             // Okay, so they want to see their group's activity.
             
             // 1. Get Downline IDs (Reuse logic or do simple recursive fetch)
             // We can duplicate the downline fetch logic or just trust the frontend to understand "My Actions" vs "Team Actions"
             // Let's just return ALL for now if the user is asking for "omset grup" context.
             // But for scalability, let's limit to Own + Direct IDs? 
             // To perfectly match "MockDatabase" behavior (which showed global/demo data), 
             // we should probably just show Everything for Admin, and Own for Member, 
             // but maybe Member wants to see if their downline purchased.
             
             // Let's implement OWN + DIRECT DOWNLINE for now.
             const directDownlines = await prisma.user.findMany({ where: { uplineId: userId }, select: { id: true } });
             // Include Customers if any
             const ids = [userId, ...directDownlines.map(d => d.id)];
             
             whereTx = { 
                 OR: [
                     { userId: { in: ids } },
                     { customer: { referrerId: { in: ids } } }
                 ],
                 isArchived: showHidden
             };
             whereWd = { 
                 userId: { in: ids },
                 isArchived: showHidden
             };
        }

        const transactions = await prisma.transaction.findMany({
            where: whereTx,
            take: 20,
            orderBy: { timestamp: 'desc' },
            include: { 
                user: { select: { name: true } },
                customer: { select: { name: true } } 
            }
        });

        const withdrawals = await prisma.withdrawalRequest.findMany({
            where: whereWd,
            take: 20,
            orderBy: { requestDate: 'desc' },
            // WithdrawalRequest has direct userName field
        });

        // Combine and Sort
        const combined = [
            ...transactions.map(t => ({
                id: t.id,
                date: t.timestamp,
                userName: t.user?.name || t.customer?.name || 'Unknown',
                type: 'PURCHASE',
                description: `Purchased ${t.items ? 'Products' : 'Items'}`,
                amount: t.totalAmount,
                status: t.status,
                isArchived: t.isArchived
            })),
            ...withdrawals.map(w => ({
                id: w.id,
                date: w.requestDate,
                userName: w.userName || 'Unknown',
                type: 'WITHDRAWAL',
                description: 'Withdrawal Request',
                amount: w.amount,
                status: w.status,
                isArchived: w.isArchived
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50);

        res.json(combined);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching recent actions', error });
    }
};

export const archiveActions = async (req: Request, res: Response) => {
    try {
        const { items, archive } = req.body; // items: { id: string, type: 'PURCHASE' | 'WITHDRAWAL' }[]
        
        if (!Array.isArray(items)) return res.status(400).json({ message: 'Invalid items format' });

        const purchaseIds = items.filter((i: any) => i.type === 'PURCHASE').map((i: any) => i.id);
        const withdrawalIds = items.filter((i: any) => i.type === 'WITHDRAWAL').map((i: any) => i.id);

        if (purchaseIds.length > 0) {
            await prisma.transaction.updateMany({
                where: { id: { in: purchaseIds } },
                data: { isArchived: archive }
            });
        }

        if (withdrawalIds.length > 0) {
            await prisma.withdrawalRequest.updateMany({
                where: { id: { in: withdrawalIds } },
                data: { isArchived: archive }
            });
        }

        res.json({ message: 'Actions updated', count: items.length });
    } catch (error) {
        res.status(500).json({ message: 'Error archiving actions', error });
    }
};

// Update a user (Admin)
export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, email, role, kyc, password } = req.body;
        
        const data: any = {};
        if (name) data.name = name;
        if (email) data.email = email;
        if (role) data.role = role;
        if (kyc) data.kyc = kyc;
        if (password && password.trim() !== '') {
            data.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data,
            select: { id: true, name: true, email: true, role: true, referralCode: true, uplineId: true, isActive: true, kyc: true, avatar: true }
        });
        
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Error updating user' });
    }
};

// Get Human Design
export const getHumanDesign = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // Access Control: Admin or Own Profile
        // @ts-ignore
        if (req.user.role !== 'ADMIN' && req.user.id !== id) {
            return res.status(403).json({ message: 'Access Denied' });
        }

        const profile = await prisma.humanDesignProfile.findUnique({
            where: { userId: id }
        });
        res.json(profile || null);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching HD profile' });
    }
};

// Save Human Design
export const saveHumanDesign = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body;
        
        // Remove ID and userId from data if present to avoid conflicts
        delete data.id;
        delete data.userId;
        delete data.updatedAt;

        const profile = await prisma.humanDesignProfile.upsert({
            where: { userId: id },
            update: data,
            create: {
                ...data,
                userId: id
            }
        });
        res.json(profile);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error saving HD profile', error });
    }
};

// Admin Transfer Points
export const transferPoints = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { amount, direction, reason } = req.body; // direction: 'IN' (Add) | 'OUT' (Deduct)
        
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        const pointAmount = Number(amount);
        if (isNaN(pointAmount) || pointAmount <= 0) return res.status(400).json({ message: 'Invalid amount' });

        const finalAmount = direction === 'OUT' ? -pointAmount : pointAmount;
        
        // Check balance for deduction
        if (direction === 'OUT' && user.walletBalance < pointAmount) {
            return res.status(400).json({ message: 'Insufficient balance for deduction' });
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { walletBalance: { increment: finalAmount } }
        });

        // Log to WalletLog
        await prisma.walletLog.create({
            data: {
                userId: id,
                type: direction === 'IN' ? 'ADMIN_TRANSFER_IN' : 'ADMIN_TRANSFER_OUT',
                amount: finalAmount,
                description: reason || 'Admin Adjustment'
            }
        });

        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Error transferring points', error });
    }
};

export const getKakaItems = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Access Control
        if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && !user.isKakaUnlocked) {
            return res.status(403).json({ message: 'Access Denied: KAKA Content is locked.' });
        }

        const items = await prisma.kakaItem.findMany({
            orderBy: { date: 'desc' }
        });

        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching Kaka items', error });
    }
};

// --- FILE ACCESS MANAGEMENT (ADMIN) ---

export const getAdminUserTransactions = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const transactions = await prisma.transaction.findMany({
            where: { 
                userId: id, 
                status: { in: ['PAID', 'PENDING'] } // [NEW] Include Pending for Manual Approval/Upload
            },
            orderBy: { timestamp: 'desc' }
        });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching transactions', error });
    }
};

export const grantAccess = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { fileName, fileUrl } = req.body;
        
        // Create a 'Manual Grant' transaction
        const product: any = {
            id: 'manual_' + Date.now(),
            name: fileName,
            price: 0,
            points: 0,
            description: 'Manual Access Grant by Admin',
            pdfUrl: fileUrl,
            image: 'https://placehold.co/400?text=PDF'
        };

        const item: any = { product, quantity: 1 };

        const tx = await prisma.transaction.create({
            data: {
                id: 'grant_' + Date.now(),
                userId: id,
                // userName removed as it's not in schema
                items: JSON.stringify([item]), // Storing as JSON string
                subtotal: 0,
                taxAmount: 0,
                discountAmount: 0,
                pointsRedeemed: 0,
                pointsRedeemedValue: 0,
                totalAmount: 0,
                totalPointsEarned: 0,
                status: 'PAID',
                paymentMethod: 'POINT_CUT', // Using POINT_CUT as internal marker for "No Payment"
                timestamp: new Date().toISOString(),
                commissionsDistributed: true,
                isArchived: false
            }
        });

        res.json(tx);
    } catch (error) {
        res.status(500).json({ message: 'Error granting access', error });
    }
};

export const updateAccess = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // userId
        const { productId, newUrl, newName, productName } = req.body;

        // 1. Find the original product details to preserve price/description
        const user = await prisma.user.findUnique({ where: { id } });
        // [MODIFIED] Allow finding PENDING transactions too so Admin can fulfill them.
        let whereClause: any = { status: { in: ['PAID', 'PENDING'] } };
        if (user) whereClause.userId = id;
        else {
             const customer = await prisma.customer.findUnique({ where: { id } });
             if (customer) whereClause.customerId = id;
             else return res.status(404).json({ message: 'User or Customer not found' });
        }

        const transactions = await prisma.transaction.findMany({ where: whereClause, orderBy: { timestamp: 'desc' } });
        
        console.log(`[updateAccess] Found ${transactions.length} transactions. Searching for product to clone...`);

        let targetProduct: any = null;
        let originalTransactionId: string | null = null; // [NEW] Track ID to approve it

        // Search for the product to get its metadata
        for (const tx of transactions) {
            let items: any[] = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
            for (const item of items) {
                const p = item.product;
                const matchesId = productId && (p.id === productId);
                const matchesName = !matchesId && (
                    (productName && p.name === productName) || 
                    (productName && p.nameproduct === productName)
                );

                if (matchesId || matchesName) {
                    targetProduct = p;
                    originalTransactionId = tx.id; // [NEW] Capture ID
                    break;
                }
            }
            if (targetProduct) break;
        }

        if (!targetProduct) {
             console.log('[updateAccess] Product not found in history.');
             return res.status(404).json({ message: 'Original product purchase not found.' });
        }

        // [NEW] If the original transaction was PENDING, mark it as PAID now because Admin is fulfilling it.
        if (originalTransactionId) {
             await prisma.transaction.update({
                 where: { id: originalTransactionId },
                 data: { status: 'PAID' }
             });
             // [NEW] Trigger Membership Extension logic
             await extendMembership(originalTransactionId);
        }



// ... (inside updateAccess)

        console.log(`[updateAccess] Found original product: ${targetProduct.name}. Processing file...`);

        let finalFileUrl = newUrl;

        // HANDLE FILE SAVING TO DISK IF BASE64
        if (newUrl && newUrl.startsWith('data:')) {
            try {
                const matches = newUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const buffer = Buffer.from(matches[2], 'base64');
                    // Create unique filename
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    const saneName = newName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    const fileName = `upload_${saneName}_${uniqueSuffix}.pdf`;
                    
                    const uploadDir = path.join(__dirname, '../../public/uploads');
                    // Ensure directory exists
                    if (!fs.existsSync(uploadDir)) {
                         fs.mkdirSync(uploadDir, { recursive: true });
                    }

                    const filePath = path.join(uploadDir, fileName);
                    fs.writeFileSync(filePath, buffer);
                    
                    finalFileUrl = `/uploads/${fileName}`; // Save RELATIVE URL
                    console.log(`[updateAccess] File saved to disk: ${finalFileUrl}`);
                }
            } catch (err) {
                console.error('[updateAccess] Failed to save file to disk:', err);
                // Fallback to storing Base64 if disk write fails (though it might fail DB too)
            }
        }

        // 2. Create a NEW Transaction "Overlay" with the updated file
        // This avoids modifying the old large JSON blob (which hits max_allowed_packet)
        // and ensures the 'newest' entry corresponds to the latest file.
        
        const updatedProduct = {
            ...targetProduct,
            name: newName, // Update Name
            uploadedFileName: newName,
            pdfUrl: finalFileUrl, // Use the Disk URL or Base64 (if disk failed)
            updatedAt: new Date().toISOString()
        };

        const newItem = { product: updatedProduct, quantity: 1 };

        await prisma.transaction.create({
            data: {
                id: 'update_' + Date.now(),
                userId: user ? id : null,
                customerId: !user ? id : null,
                items: JSON.stringify([newItem]), // New compact transaction with just this item
                subtotal: 0,
                taxAmount: 0,
                discountAmount: 0,
                pointsRedeemed: 0,
                pointsRedeemedValue: 0,
                totalAmount: 0,
                totalPointsEarned: 0,
                status: 'PAID',
                paymentMethod: 'POINT_CUT', // Internal marker
                timestamp: new Date().toISOString(),
                commissionsDistributed: true, // Don't re-run commissions
                isArchived: false,
                nameproduct: newName
            }
        });

        console.log('[updateAccess] Success: Created new transaction entry with updated file.');
        res.json({ message: 'File updated successfully (New entry created)' });

    } catch (error: any) {
        console.error('Error updating access:', error);
        res.status(500).json({ 
            message: `Server Error: ${error.message || error}`, 
            error 
        });
    }
};

// --- KAKA MANAGEMENT (ADMIN) ---

export const createKakaItem = async (req: Request, res: Response) => {
    try {
        const { date, description, mediaType, mediaUrl, mediaName } = req.body;
        const newItem = await prisma.kakaItem.create({
            data: {
                id: 'kaka_' + Date.now(),
                date: new Date(date), // Ensure Date properties
                description,
                mediaType,
                mediaUrl,
                mediaName
            }
        });
        res.json(newItem);
    } catch (error) {
        res.status(500).json({ message: 'Error creating Kaka item', error });
    }
};

export const updateKakaItem = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { date, description, mediaType, mediaUrl, mediaName } = req.body;
        
        const updatedItem = await prisma.kakaItem.update({
            where: { id },
            data: {
                date: date ? new Date(date) : undefined,
                description,
                mediaType,
                mediaUrl,
                mediaName
            }
        });
        res.json(updatedItem);
    } catch (error) {
        res.status(500).json({ message: 'Error updating Kaka item', error });
    }
};

export const deleteKakaItem = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.kakaItem.delete({ where: { id } });
        res.json({ message: 'Kaka item deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting Kaka item', error });
    }
};

export const sendFileEmail = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { productId, email, subject, message } = req.body;

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const recipient = email || user.email;
        const emailSubject = subject || 'File Access Granted';
        const emailBody = message || 'Please check your dashboard for access.';

        console.log('\n=============================================================');
        console.log('                 MOCK EMAIL SERVER (LOCALHOST)               ');
        console.log('=============================================================');
        console.log(`TO:      ${recipient}`);
        console.log(`SUBJECT: ${emailSubject}`);
        console.log('-------------------------------------------------------------');
        console.log('BODY:');
        console.log(emailBody);
        console.log('\n[System]: Attached Product ID Access: ' + productId);
        console.log('=============================================================\n');
        
        await new Promise(resolve => setTimeout(resolve, 1500));

        res.json({ message: `File access sent to ${recipient}` });
    } catch (error) {
        res.status(500).json({ message: 'Error sending email', error });
    }
};
