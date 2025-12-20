import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { v4 as uuidv4 } from 'uuid';

// ==========================================
// ADMIN: Manage Slots
// ==========================================

// Admin: Get all credits (for extracting Magic Links)
export const getAllCredits = async (req: Request, res: Response) => {
    try {
        const credits = await prisma.consultationCredit.findMany({
            include: {
                user: { select: { name: true, email: true } },
                customer: { select: { name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        // Transform to include full Magic Link
        const data = credits.map(c => ({
            ...c,
            magicLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/booking?token=${c.magicToken}`
        }));

        res.json(data);
    } catch (error) {
        console.error('Error fetching credits:', error);
        res.status(500).json({ message: 'Error fetching credits' });
    }
};

export const createSlots = async (req: Request, res: Response) => {
    try {
        const { startTime, endTime, durationMinutes = 60 } = req.body;
        // Basic bulk creation logic could be expanded
        // For now, accept a single slot or list if needed. 
        // Let's assume single slot or array of slots:
        
        let slotsToCreate = [];
        if (Array.isArray(req.body.slots)) {
            slotsToCreate = req.body.slots.map((s: any) => ({
                startTime: new Date(s.startTime),
                endTime: new Date(s.endTime)
            }));
        } else {
            slotsToCreate = [{
                startTime: new Date(startTime),
                endTime: new Date(endTime)
            }];
        }

        await prisma.consultationSlot.createMany({
            data: slotsToCreate
        });

        res.json({ message: 'Slots created successfully' });
    } catch (error: any) {
        console.error('Error creating slots:', error);
        res.status(500).json({ message: 'Error creating slots', details: error.message, stack: error.stack });
    }
};

export const getSchedule = async (req: Request, res: Response) => {
    try {
        const slots = await prisma.consultationSlot.findMany({
            include: {
                session: {
                    include: {
                        credit: {
                            include: {
                                user: { select: { name: true, email: true } },
                                customer: { select: { name: true, email: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { startTime: 'asc' }
        });
        res.json(slots);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching schedule', error });
    }
};

export const updateSessionNotes = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // Session ID
        const { adminNotes, clientNotes, recordingUrl } = req.body;

        const session = await prisma.consultationSession.update({
            where: { id },
            data: { adminNotes, clientNotes, recordingUrl }
        });

        res.json({ message: 'Notes updated', session });
    } catch (error) {
        res.status(500).json({ message: 'Error updating notes', error });
    }
};

export const updateSessionStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // COMPLETED, CANCELED

        const session = await prisma.consultationSession.update({
            where: { id },
            data: { status }
        });
        
        // If canceled, free up the slot?
        if (status === 'CANCELED') {
            await prisma.consultationSlot.update({
                where: { id: session.slotId },
                data: { isBooked: false }
            });
        }

        res.json({ message: 'Status updated', session });
    } catch (error) {
        res.status(500).json({ message: 'Error updating status', error });
    }
};

export const sendReminder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        const session = await prisma.consultationSession.findUnique({
             where: { id },
             include: {
                 slot: true,
                 credit: { include: { user: true, customer: true } }
             }
        });
        
        if (!session) return res.status(404).json({ message: 'Session not found' });
        
        const recipientName = session.credit.user?.name || session.credit.customer?.name || 'Client';
        const recipientEmail = session.credit.user?.email || session.credit.customer?.email;
        const date = new Date(session.slot.startTime).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
        
        // Mock Email
        console.log('--- EMAIL MOCK SERVICE ---');
        console.log(`To: ${recipientEmail} (${recipientName})`);
        console.log('Subject: Reminder: Upcoming Consultation Session');
        console.log(`Body: Hi ${recipientName}, just a reminder for your upcoming session on ${date}. See you there!`);
        console.log('--------------------------');
        
        // In real app, call emailService here
        
        res.json({ message: 'Reminder sent (Mock)' });
    } catch (error) {
        res.status(500).json({ message: 'Error sending reminder', error });
    }
};

export const adminReschedule = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // Session ID
        const { newSlotId } = req.body;

        // Transactional update
        await prisma.$transaction(async (tx) => {
            const session = await tx.consultationSession.findUnique({ where: { id } });
            if (!session) throw new Error('Session not found');

            // Free up old slot
            await tx.consultationSlot.update({
                where: { id: session.slotId },
                data: { isBooked: false }
            });

            // Book new slot
            await tx.consultationSlot.update({
                where: { id: newSlotId },
                data: { isBooked: true }
            });

            // Update session
            await tx.consultationSession.update({
                where: { id },
                data: { 
                    slotId: newSlotId,
                    status: 'RESCHEDULED',
                    rescheduleCount: { increment: 1 } 
                }
            });
        });

        res.json({ message: 'Session rescheduled successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error rescheduling', error });
    }
};

// ==========================================
// PUBLIC / GUEST: Booking
// ==========================================

// ...
export const validateToken = async (req: Request, res: Response) => {
    try {
        const { token } = req.query;
        console.log(`[Validation] Checking token: "${token}"`); // Log input

        if (!token || typeof token !== 'string') return res.status(400).json({ message: 'Token required' });

        const credit = await prisma.consultationCredit.findUnique({
            where: { magicToken: token },
            include: {
                user: { select: { name: true, email: true } },
                customer: { select: { name: true, email: true } }
            }
        });

        if (!credit) {
            console.warn(`[Validation] Token NOT FOUND: "${token}"`);
            return res.status(404).json({ message: 'Invalid token' });
        }

        console.log(`[Validation] Token VALID for: ${credit.user?.name || credit.customer?.name}`);

        // Get Available Slots
        const availableSlots = await prisma.consultationSlot.findMany({
            where: { isBooked: false, startTime: { gt: new Date() } },
            orderBy: { startTime: 'asc' }
        });

        res.json({ credit, availableSlots });
    } catch (error) {
        console.error('[Validation] Error:', error);
        res.status(500).json({ message: 'Error validating token', error });
    }
};
// ...


export const getSessions = async (req: Request, res: Response) => {
    try {
        const { token } = req.query;
        if (!token || typeof token !== 'string') return res.status(400).json({ message: 'Token required' });

        const credit = await prisma.consultationCredit.findUnique({
            where: { magicToken: token }
        });

        if (!credit) return res.status(404).json({ message: 'Invalid token' });

        const sessions = await prisma.consultationSession.findMany({
            where: { creditId: credit.id },
            include: {
                slot: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sessions', error });
    }
};

export const bookSlot = async (req: Request, res: Response) => {
    try {
        const { token, slotId } = req.body;
        
        const credit = await prisma.consultationCredit.findUnique({ where: { magicToken: token } });
        if (!credit) return res.status(404).json({ message: 'Invalid token' });

        if (credit.usedQuota >= credit.totalQuota) {
            return res.status(400).json({ message: 'Quota exceeded' });
        }

        const slot = await prisma.consultationSlot.findUnique({ where: { id: slotId } });
        if (!slot || slot.isBooked) return res.status(400).json({ message: 'Slot unavailable' });

        const session = await prisma.$transaction(async (tx) => {
            // Mark slot booked
            await tx.consultationSlot.update({ where: { id: slotId }, data: { isBooked: true } });
            
            // Increment quota
            await tx.consultationCredit.update({ where: { id: credit.id }, data: { usedQuota: { increment: 1 } } });
            
            // Create session
            return await tx.consultationSession.create({
                data: {
                    creditId: credit.id,
                    slotId: slotId,
                    status: 'SCHEDULED'
                }
            });
        });

        res.json({ message: 'Booking successful', session });
    } catch (error) {
        res.status(500).json({ message: 'Booking failed', error });
    }
};

export const rescheduleSlot = async (req: Request, res: Response) => {
    try {
        const { token, sessionId, newSlotId } = req.body;
        
        const credit = await prisma.consultationCredit.findUnique({ where: { magicToken: token } });
        if (!credit) return res.status(404).json({ message: 'Invalid token' });

        const session = await prisma.consultationSession.findUnique({ where: { id: sessionId } });
        if (!session || session.creditId !== credit.id) return res.status(404).json({ message: 'Session not found' });

        if (session.rescheduleCount >= 1) return res.status(400).json({ message: 'Reschedule limit reached (1x)' });

        const newSlot = await prisma.consultationSlot.findUnique({ where: { id: newSlotId } });
        if (!newSlot || newSlot.isBooked) return res.status(400).json({ message: 'New slot unavailable' });

        await prisma.$transaction(async (tx) => {
            // Free old
            await tx.consultationSlot.update({ where: { id: session.slotId }, data: { isBooked: false } });
            // Book new
            await tx.consultationSlot.update({ where: { id: newSlotId }, data: { isBooked: true } });
            // Update session
            await tx.consultationSession.update({ 
                where: { id: sessionId },
                data: { slotId: newSlotId, status: 'RESCHEDULED', rescheduleCount: { increment: 1 } }
            });
        });

        res.json({ message: 'Reschedule successful' });
    } catch (error) {
        res.status(500).json({ message: 'Reschedule failed', error });
    }
};

// ==========================================
// MEMBER: My Consultations
// ==========================================

export const getMyConsultations = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        
        // 1. Get User and their Email
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true }
        });

        if (!user) return res.status(404).json({ message: 'User not found' });

        // 2. Find any Customer record with the same email
        // (Sometimes consultations are booked as Guest/Customer before user registers or if admin selects generic customer)
        const customer = await prisma.customer.findFirst({
            where: { email: user.email }
        });

        // 3. Build Query: Credits owned by User ID OR linked Customer ID
        const whereClause: any = {
            OR: [
                { userId: userId }
            ]
        };

        if (customer) {
            whereClause.OR.push({ customerId: customer.id });
        }
        
        const credits = await prisma.consultationCredit.findMany({
            where: whereClause,
            include: {
                sessions: {
                    include: {
                        slot: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        // Enrich with magic link for convenience
        const data = credits.map(c => ({
            ...c,
            magicLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/booking?token=${c.magicToken}`
        }));

        res.json(data);
    } catch (error) {
        console.error('Error fetching my consultations:', error);
        res.status(500).json({ message: 'Error fetching consultations', error });
    }
};
