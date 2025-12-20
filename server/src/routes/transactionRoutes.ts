import { Router } from 'express';
import { createTransaction, getTransactions, handleMidtransNotification, toggleArchive } from '../controllers/transactionController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.post('/guest', createTransaction); // Public Route
router.post('/', authenticateToken, createTransaction);
router.get('/', authenticateToken, getTransactions);
router.put('/archive', authenticateToken, toggleArchive); // [NEW] Archive Route
router.post('/notification', handleMidtransNotification); // Midtrans Webhook

export default router;
