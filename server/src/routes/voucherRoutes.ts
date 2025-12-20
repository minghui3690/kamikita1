import { Router } from 'express';
import { getVouchers, createVoucher, deleteVoucher } from '../controllers/voucherController';
// import { isAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Assuming admin check is done in frontend or we add middleware later
router.get('/', getVouchers);
router.post('/', createVoucher);
router.delete('/:id', deleteVoucher);

export default router;
