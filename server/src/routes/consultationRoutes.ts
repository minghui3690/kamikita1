import { Router } from 'express';
import { 
    createSlots, getSchedule, updateSessionNotes, adminReschedule, getAllCredits, // Admin
    updateSessionStatus, sendReminder, // [NEW] Follow-up
    validateToken, getSessions, bookSlot, rescheduleSlot, // Guest
    getMyConsultations // [NEW] Member
} from '../controllers/consultationController';
import { authenticateToken, isAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Public / Guest (Magic Link)
router.get('/validate-token', validateToken);
router.get('/sessions', getSessions);
router.post('/book', bookSlot);
router.post('/reschedule', rescheduleSlot);

// Admin (Protected)
router.post('/admin/slots', authenticateToken, isAdmin, createSlots);
router.get('/admin/schedule', authenticateToken, isAdmin, getSchedule); // Admin/Manager
router.get('/admin/credits', authenticateToken, isAdmin, getAllCredits); // [NEW] Link extraction
router.put('/admin/session/:id/notes', authenticateToken, isAdmin, updateSessionNotes);
router.put('/admin/session/:id/status', authenticateToken, isAdmin, updateSessionStatus); // [NEW]
router.post('/admin/session/:id/reminder', authenticateToken, isAdmin, sendReminder); // [NEW]
router.post('/admin/session/:id/reschedule', authenticateToken, isAdmin, adminReschedule);

// Member (Protected)
router.get('/my-consultations', authenticateToken, getMyConsultations);

export default router;
