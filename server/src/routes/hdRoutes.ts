import express from 'express';
import { authenticateToken, isAdmin } from '../middlewares/authMiddleware';
import * as hdController from '../controllers/hdController';

const router = express.Router();

// Public / Member Routes
router.post('/my-knowledge', authenticateToken, hdController.getMyKnowledge); 

// Admin Routes
router.get('/', authenticateToken, isAdmin, hdController.getAllKnowledge);
router.get('/:key', authenticateToken, isAdmin, hdController.getKnowledgeByKey);
router.post('/', authenticateToken, isAdmin, hdController.saveKnowledge);
router.delete('/:key', authenticateToken, isAdmin, hdController.deleteKnowledge);

export default router;
