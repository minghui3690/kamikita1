import { Router } from 'express';
import { getCustomers, sendCustomerEmail, archiveCustomers, upgradeToMember } from '../controllers/customerController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', authenticateToken, getCustomers);
router.post('/archive', authenticateToken, archiveCustomers);
router.post('/:id/send-email', authenticateToken, sendCustomerEmail);
router.post('/:id/upgrade', authenticateToken, upgradeToMember);

export default router;
