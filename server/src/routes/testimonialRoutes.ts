import express from 'express';
import { authenticateToken, isAdmin } from '../middlewares/authMiddleware';
import { 
    createTestimonial, 
    getProductReviews, 
    getAllReviews, 
    updateReviewStatus, 
    deleteReview 
} from '../controllers/testimonialController';

const router = express.Router();

// Public
router.get('/product/:productId', getProductReviews);

// Member
router.post('/', authenticateToken, createTestimonial);

// Admin
router.get('/admin/all', authenticateToken, isAdmin, getAllReviews);
router.patch('/:id/status', authenticateToken, isAdmin, updateReviewStatus);
router.delete('/:id', authenticateToken, isAdmin, deleteReview);

export default router;
